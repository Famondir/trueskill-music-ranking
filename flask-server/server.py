from flask import Flask
from flask import request
import pandas as pd
import trueskillthroughtime as ttt
import datetime


def prepare_song_rating():
    songlist = pd.read_csv("../trueskill_tt/liederliste.csv")
    songlist.insert(1, "Wertung", ttt.MU, True)
    songlist.insert(2, "Unsicherheit", ttt.SIGMA, True)
    
    competition_history = pd.read_csv("../trueskill_tt/vergleiche.csv")
    
    return songlist


def generate_competition_queue():
    competition_list = songlist.sort_values(by=["Wertung"])
    # print(competition_list.iloc[0:5, 0:3])
    competition_list_1 = [title for idx, title in enumerate(competition_list["Liedanfang"].to_list()) if idx%2 == 0]
    competition_list_2 = [title for idx, title in enumerate(competition_list["Liedanfang"].to_list()) if idx%2 == 1]
    competition_queue = list(zip(competition_list_1, competition_list_2))  # drops entries if one list is longer
    # print(competition_queue[-5:])
    return competition_queue


songlist = prepare_song_rating()
competition_queue = generate_competition_queue()


app = Flask(__name__)


@app.route("/api/load_csv_as_dataframe/<string:filename>")
def read_csv_as_dataframe(filename):
    return pd.read_csv("../trueskill_tt/"+filename).to_json(orient='records')


@app.route("/api/load_song_rating")
def load_song_rating():
    songlist = prepare_song_rating()
    return songlist.to_json(orient='records')


@app.route("/api/get_first_competition")
def get_next_competition():
    return songlist.loc[songlist['Liedanfang'].isin(competition_queue[0])].to_json(orient='records')


@app.route('/api/declare_competition_winner', methods=['POST'])
def declare_competition_winner():
    winner = request.get_json()
    last_competition = competition_queue.pop(0)
    winner_index = 0 if last_competition[0] == winner else 1
    competition_history = pd.read_csv("../trueskill_tt/vergleiche2.csv")
    competition_history.loc[len(competition_history)] = [datetime.date.today().strftime("%Y-%m-%d"), last_competition[winner_index], last_competition[not winner_index]]
    competition_history.to_csv("../trueskill_tt/vergleiche2.csv", index=False)
    return get_next_competition(), 201


if __name__ == "__main__":
    app.run(debug=True)