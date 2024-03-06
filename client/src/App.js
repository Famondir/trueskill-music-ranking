import React, { useState, useEffect } from "react";
import DataTable from 'react-data-table-component';

import 'bootstrap/dist/css/bootstrap.min.css';
import './custom.css';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Card from 'react-bootstrap/Card';
import CardGroup from 'react-bootstrap/CardGroup';
import CardBody from "react-bootstrap/esm/CardBody";
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';
import Image from 'react-bootstrap/Image';


function App() {

  const [competitionData, setCompetitionData] = useState()
  const [competitionRecords, setCompetitionRecords] = useState()

  const [songData, setSongData] = useState()
  const [songRecords, setSongRecords] = useState()

  const [lied, setData] = useState([])

  const competitionColumns = [
    {
      name: 'Datum',
      selector: row => row.Datum,
      sortable: true
    },
    {
      name: 'Gewinner',
      selector: row => row.Gewinner,
      sortable: true
    },
    {
      name: 'Verlierer',
      selector: row => row.Verlierer,
      sortable: true
    },
  ];

  const songColumns = [
    {
      name: 'Lied',
      selector: row => row.Liedanfang,
      sortable: true
    },
    {
      name: 'Wertung',
      selector: row => row.Wertung,
      sortable: true
    },
    {
      name: 'Unsicherheit',
      selector: row => row.Unsicherheit,
      sortable: true
    },
    {
      name: 'Quelle',
      selector: row => row.Quelle,
      sortable: true
    },
    {
      name: 'Seitenzahl',
      selector: row => row.Seite,
      sortable: true
    },
  ];

  const customStyles = {
    headCells: {
      style: {
        fontSize: '1.25rem',
        fontWeight: 550,
      },
    },
    cells: {
      style: {
        fontSize: '1rem',
      },
    },
  };

  const partial = (func, ...args) => (...rest) => func(...args, ...rest);

  function handleFilter(data, setData, row_name_1, row_name_2, event) {
    const newData = data.filter(row => {
      return (
        row[row_name_1].toLowerCase().includes(event.target.value.toLowerCase()) || 
        row[row_name_2]?.toLowerCase().includes(event.target.value.toLowerCase())
      )
    })
    setData(newData)
  }

  function SongCard({lied, quelle, seite}) {
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    return (
      <>
      <Card>
        <a href="#" onClick={handleShow}>
          <Card.Img variant="top" src={"images/songs/"+lied.toLowerCase().replaceAll(",", "").replaceAll(" ", "_")+".png"} />
        </a>
        <CardBody>
          <Card.Title>{lied}</Card.Title>
          <Card.Text>
        
          </Card.Text>
          <Table striped bordered hover>
              <tbody>
                <tr>
                  <th>Quelle:</th><td>{quelle}</td>
                </tr>
                <tr>
                  <th>Seite:</th><td>{seite}</td>
                </tr>
              </tbody>
            </Table>
        </CardBody>
        <Card.Footer className="d-grid">
          <Button
            variant="primary"
            size="lg"
            onClick={() => post_winner(lied)}
            >
            {lied}
          </Button>
        </Card.Footer>
      </Card>

      <Modal
        show={show}
        onHide={handleClose}
        size="xl"
      >
      <Modal.Header closeButton>
        <Modal.Title>{lied}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Image 
          variant="top" 
          src={"images/songs/"+lied.toLowerCase().replaceAll(",", "").replaceAll(" ", "_")+".png"} 
          fluid
          className="modal-height-limit"
        />
      </Modal.Body>
      </Modal>
      </>
    )
  }

  const handleCompetitionFilter = partial(handleFilter, competitionData, setCompetitionRecords, "Gewinner", "Verlierer")
  const handleSongFilter = partial(handleFilter, songData, setSongRecords, "Liedanfang", "")

  async function post_winner(content) {
    fetch("api/declare_competition_winner", {
      method: "POST",
      headers: {
        'Content-Type' : 'application/json'
      },
      body: JSON.stringify(content)
    }).then(
      res => {
        if (res.ok) {
          return res.json()
        }
      }
    ).then(
      data => {
        setData(data)
        console.log(data)
      }
    )
  }

  useEffect(() => {
    fetch("/api/load_csv_as_dataframe/vergleiche.csv").then(
      res => {
        if (res.ok) {
          return res.json()
        }
      }
    ).then(
      data => {
        setCompetitionData(data)
        setCompetitionRecords(data)
        // console.log(data)
      }
    )
  }, [])

  useEffect(() => {
    fetch("/api/load_song_rating").then(
      res => {
        if (res.ok) {
          return res.json()
        }
      }
    ).then(
      data => {
        setSongData(data)
        setSongRecords(data)
        // console.log(data)
      }
    )
  }, [])

  useEffect(() => {
    fetch("/api/get_first_competition").then(
      res => {
        if (res.ok) {
          return res.json()
        }
      }
    ).then(
      data => {
        console.log(data[0].Liedanfang)
        setData(data)
      }
    )
  }, [])

  return (
    <Container>
      <Tabs
        defaultActiveKey="competition"
        id=""
        className="mb-3"
      >
        <Tab eventKey="competition" title="Rate next!">
          <Row id="competition">

            {(lied.length === 0) ? (
              <p>Loading...</p>
            ) : (
              <div>
                <h2 className="text-center">Welches Lied gefällt Dir besser?</h2>
                <CardGroup>
                  <SongCard
                    lied={lied[0].Liedanfang}
                    quelle={lied[0].Quelle}
                    seite={lied[0].Seite}
                  />
                  <SongCard
                    lied={lied[1].Liedanfang}
                    quelle={lied[1].Quelle}
                    seite={lied[1].Seite}
                  />
                </CardGroup>
              </div>

            )}

          </Row>
        </Tab>
        <Tab eventKey="competition-history" title="Rating history">
          <Row id="competitionTable">

            {(typeof competitionData === 'undefined') ? (
              <p>Loading...</p>
            ) : (
              <div>
                <div>
                  <span>Suche Lied: </span><input type="text" onChange={handleCompetitionFilter}></input>
                </div>
                <DataTable
                  columns={competitionColumns}
                  data={competitionRecords}
                  customStyles={customStyles}
                  theme="light"
                  fixedHeader
                  pagination
                ></DataTable>
              </div>
            )}

          </Row>
        </Tab>
        <Tab eventKey="contact" title="Song rating">
          <Row id="songData">

            {(typeof songData === 'undefined') ? (
              <p>Loading...</p>
            ) : (
              <div>
                <div>
                  <span>Suche Lied: </span><input type="text" onChange={handleSongFilter}></input>
                </div>
                <DataTable
                  columns={songColumns}
                  data={songRecords}
                  customStyles={customStyles}
                  theme="light"
                  fixedHeader
                  pagination
                ></DataTable>
              </div>
            )}

          </Row>
        </Tab>
      </Tabs>
    </Container>
  )
}

export default App