from flask import Flask
import pandas as pd

app = Flask(__name__)

# Members API Route
@app.route("/api/load_csv_as_dataframe/<string:filename>")
def read_csv_as_dataframe(filename):
    return pd.read_csv("../trueskill_tt/"+filename).to_json(orient='records')
    # return {"members": ["Member1", "Member2", "Member3"]}


if __name__ == "__main__":
    app.run(debug=True)