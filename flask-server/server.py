from flask import Flask
from flask import request
import pandas as pd
import trueskillthroughtime as ttt
import datetime
import os.path


def generate_song_rating():
    songlist = pd.read_csv("../trueskill_tt/liederliste.csv")
    songlist.insert(1, "Wertung", pd.NA, True)
    songlist.insert(2, "Unsicherheit", ttt.SIGMA, True)
    songlist["BildExistiert"] = songlist["Liedanfang"].map(
        lambda x: os.path.isfile(
            "../client/public/images/songs/"+x.lower().replace(" ", "_").replace(",", "").replace("'", "")+".png"
            )
        )
    
    competition_history = pd.read_csv("../trueskill_tt/vergleiche.csv")
    comp =  [[[gewinner], [verlierer]] for gewinner, verlierer 
             in zip(competition_history["Gewinner"], competition_history["Verlierer"])]
    times = competition_history["Datum"].map(lambda string: 
        (datetime.date.today()-datetime.datetime.strptime(string, "%Y-%m-%d").date()).days).to_list()
    
    h = ttt.History(comp, times=times, gamma=0.1)
    h.convergence()
    
    for agent in h.agents:
        temp = h.learning_curves()[agent][-1][1]
        songlist.loc[songlist["Liedanfang"] == agent, ["Wertung", "Unsicherheit"]] = (round(temp.mu, 3), round(temp.sigma, 3))
    
    return songlist


def generate_competition_queue():
    competition_list = songlist.sort_values(by=["Unsicherheit"], ascending=False)
    # print(competition_list.iloc[0:5, 0:3])
    competition_list_1 = [title for idx, title in enumerate(competition_list["Liedanfang"].to_list()) if idx%2 == 0]
    competition_list_2 = [title for idx, title in enumerate(competition_list["Liedanfang"].to_list()) if idx%2 == 1]
    competition_queue = list(zip(competition_list_1, competition_list_2))  # drops entries if one list is longer
    # print(competition_queue[-5:])
    return competition_queue


songlist = generate_song_rating()
competition_queue = generate_competition_queue()


app = Flask(__name__)


""" @app.route("/api/load_csv_as_dataframe/<string:filename>")
def read_csv_as_dataframe(filename):
    return pd.read_csv("../trueskill_tt/"+filename).to_json(orient='records') """

@app.route("/api/load_competition_history")
def read_csv_as_dataframe():
    competition_history = pd.read_csv("../trueskill_tt/vergleiche.csv").iloc[::-1]
    return competition_history.to_json(orient='records')


@app.route("/api/load_song_rating")
def load_song_rating():
    songlist = generate_song_rating()
    return songlist.to_json(orient='records')


@app.route("/api/get_first_competition")
def get_next_competition():
    return songlist.loc[songlist['Liedanfang'].isin(competition_queue[0])].to_json(orient='records')


@app.route('/api/declare_competition_winner', methods=['POST'])
def declare_competition_winner():
    winner = request.get_json()
    last_competition = competition_queue.pop(0)
    winner_index = 0 if last_competition[0] == winner else 1
    competition_history = pd.read_csv("../trueskill_tt/vergleiche.csv")
    competition_history.loc[len(competition_history)] = [datetime.date.today().strftime("%Y-%m-%d"), last_competition[winner_index], last_competition[not winner_index]]
    competition_history.to_csv("../trueskill_tt/vergleiche.csv", index=False)
    return get_next_competition(), 201


if __name__ == "__main__":
    app.run(debug=True)