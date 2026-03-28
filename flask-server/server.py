from flask import Flask, request, jsonify
import pandas as pd
import trueskillthroughtime as ttt
import datetime
import os
import glob
import yaml

# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------

# server.py lives in flask-server/; the project root is one level up.
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def load_config():
    config_path = os.path.join(PROJECT_ROOT, "config.yaml")
    with open(config_path) as f:
        return yaml.safe_load(f)


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def slugify(s):
    """Lower-case and replace spaces/punctuation — mirrors the JS helper."""
    return str(s).lower().replace(" ", "_").replace(",", "").replace("'", "")


def make_key(row, cfg):
    """Build the composite string key for an item row."""
    sep = cfg["item"]["key_separator"]
    return sep.join(str(row[f]) for f in cfg["item"]["key_fields"])


def check_image_exists(row, cfg):
    """Return True when the item's image file exists on disk (server-side check)."""
    image_cfg = cfg["item"].get("image", {})
    if not image_cfg.get("enabled", False):
        return False
    base = image_cfg.get("server_check_base_path") or ""
    if not base:
        # Server-side check disabled (e.g. in Docker where images live only in
        # the frontend container). The frontend will handle missing images.
        return False
    template = image_cfg["path_template"]
    do_slug = image_cfg.get("slugify", False)
    fields = {
        f: (slugify(row[f]) if do_slug else str(row[f]))
        for f in cfg["item"]["key_fields"]
    }
    path = os.path.join(PROJECT_ROOT, base.rstrip("/"), template.format(**fields))
    return os.path.isfile(path)


# ---------------------------------------------------------------------------
# Core ranking logic
# ---------------------------------------------------------------------------

def generate_item_rating(cfg):
    items_dir = os.path.join(PROJECT_ROOT, cfg["data"]["items_dir"])
    filenames = glob.glob(items_dir + "/*.csv")
    dataframes = [pd.read_csv(f) for f in filenames]
    itemlist = pd.concat(dataframes, ignore_index=True)

    itemlist.insert(1, "Wertung", pd.NA, True)
    itemlist.insert(2, "Unsicherheit", ttt.SIGMA, True)

    if cfg["item"].get("image", {}).get("enabled", False):
        itemlist["BildExistiert"] = itemlist.apply(
            lambda x: check_image_exists(x, cfg), axis=1
        )

    competition_file = os.path.join(PROJECT_ROOT, cfg["data"]["competition_file"])
    competition_history = pd.read_csv(competition_file)

    comp = [
        [[winner], [loser]]
        for winner, loser in zip(
            competition_history["Gewinner"], competition_history["Verlierer"]
        )
    ]
    times = competition_history["Datum"].map(
        lambda s: (
            datetime.date.today()
            - datetime.datetime.strptime(s, "%Y-%m-%d").date()
        ).days
        // 30
    ).to_list()

    h = ttt.History(comp, times=times, gamma=0.1)
    h.convergence()

    key_series = itemlist.apply(lambda x: make_key(x, cfg), axis=1)
    for agent in h.agents:
        temp = h.learning_curves()[agent][-1][1]
        itemlist.loc[key_series == agent, ["Wertung", "Unsicherheit"]] = (
            round(temp.mu, 3),
            round(temp.sigma, 3),
        )

    return itemlist


def rebuild_competition_queue(cfg):
    global itemlist, competition_queue
    itemlist = generate_item_rating(cfg)
    rate_field = cfg["data"]["rate_field"]
    sorted_items = itemlist[itemlist[rate_field] == 1].sort_values(
        by=["Unsicherheit"], ascending=False
    )
    keys = sorted_items.apply(lambda x: make_key(x, cfg), axis=1).to_list()
    keys_1 = [k for i, k in enumerate(keys) if i % 2 == 0]
    keys_2 = [k for i, k in enumerate(keys) if i % 2 == 1]
    competition_queue = list(zip(keys_1, keys_2))


# ---------------------------------------------------------------------------
# Application start-up
# ---------------------------------------------------------------------------

app_config = load_config()
itemlist = None
competition_queue = []
rebuild_competition_queue(app_config)

app = Flask(__name__)

# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------


@app.route("/api/config")
def get_frontend_config():
    """Return the subset of config.yaml that the frontend needs."""
    return jsonify(
        {
            "app": app_config["app"],
            "item": app_config["item"],
        }
    )


@app.route("/api/reset_competition_queue")
def reset_competition_queue():
    rebuild_competition_queue(app_config)
    return get_next_competition(), 201


@app.route("/api/load_competition_history")
def load_competition_history():
    competition_file = os.path.join(
        PROJECT_ROOT, app_config["data"]["competition_file"]
    )
    history = pd.read_csv(competition_file).iloc[::-1]
    return history.to_json(orient="records")


@app.route("/api/load_item_rating")
def load_item_rating():
    items = generate_item_rating(app_config)
    return items.to_json(orient="records")


@app.route("/api/get_first_competition")
def get_next_competition():
    key_series = itemlist.apply(lambda x: make_key(x, app_config), axis=1)
    return itemlist.loc[key_series.isin(competition_queue[0])].to_json(orient="records")


@app.route("/api/declare_competition_winner", methods=["POST"])
def declare_competition_winner():
    winner = request.get_json()
    last_competition = competition_queue.pop(0)
    winner_index = 0 if last_competition[0] == winner else 1
    competition_file = os.path.join(
        PROJECT_ROOT, app_config["data"]["competition_file"]
    )
    history = pd.read_csv(competition_file)
    history.loc[len(history)] = [
        datetime.date.today().strftime("%Y-%m-%d"),
        last_competition[winner_index],
        last_competition[not winner_index],
    ]
    history.to_csv(competition_file, index=False)
    return get_next_competition(), 201


@app.route("/api/skip_competition")
def skip_competition():
    competition_queue.pop(0)
    return get_next_competition(), 201


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    host = os.environ.get("FLASK_HOST", "127.0.0.1")
    port = int(os.environ.get("FLASK_PORT", "5000"))
    app.run(debug=debug, host=host, port=port)