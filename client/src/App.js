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
      sortable: true,
      width: "10rem"
    },
    {
      name: 'Unsicherheit',
      selector: row => row.Unsicherheit,
      sortable: true,
      width: "12rem"
    },
    {
      name: 'Quelle',
      selector: row => row.Quelle,
      sortable: true,
      width: "12rem"
    },
    {
      name: 'Seite',
      selector: row => row.Seite,
      sortable: true,
      width: "8rem"
    },
    {
      name: 'Noten',
      selector: row => row.Liedanfang,
      cell: row => BildModal(row.Liedanfang, row.Quelle, row.BildExistiert),
      //button: true,
      width: "7rem"
    },
    {
      name: 'Video',
      selector: row => row.Videolink,
      cell: row => VideoModal(row.Liedanfang, row.Videolink),
      //button: true,
      width: "7rem"
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

  function simplify_string(s) {
    return s.toLowerCase().replaceAll(" ", "_").replaceAll(/[',]/g, "").replaceAll(" ", "_");
  }

  function get_image_source(lied, quelle) {
    return "images/songs/"+
      simplify_string(quelle)+
      "/"+
      simplify_string(lied)+
      ".png";
  }

  function handleFilter(data, setData, row_name_1, row_name_2, event) {
    const newData = data.filter(row => {
      return (
        row[row_name_1].toLowerCase().includes(event.target.value.toLowerCase()) || 
        row[row_name_2]?.toLowerCase().includes(event.target.value.toLowerCase())
      )
    })
    setData(newData)
  }

  function SongCard({lied, quelle, seite, video_src}) {
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const image_src = get_image_source(lied, quelle);

    return (
      <>
      <Card>
        <a href="#" onClick={handleShow}>
          <Card.Img variant="top" src={image_src} />
        </a>
        <Card.Header className="d-grid">
          <Button
            variant="primary"
            size="lg"
            onClick={() => post_winner(lied)}
            >
            {lied}
          </Button>
        </Card.Header>
        <CardBody>
          {(video_src === null) ? (
            <Card.Text>
              Kein Videolink bereitgestellt.
            </Card.Text>
            ) : (
              <div>
                <iframe src={video_src} title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
              </div>
            )}
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
          src={image_src} 
          fluid
          className="modal-height-limit"
        />
      </Modal.Body>
      </Modal>
      </>
    )
  }

  function VideoModal(lied, video_src) {
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    return (
      <>
        {(video_src === null) ? (
          <Button href="#" onClick={handleShow} disabled>Video</Button>
        ) : (
          <Button href="#" onClick={handleShow}>Video</Button>
        )}

        <Modal
            show={show}
            onHide={handleClose}
            size="lg"
          >
          <Modal.Header closeButton>
            <Modal.Title>{lied}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <iframe src={video_src} width="100%" className="responsiveVideoEmbedding" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
          </Modal.Body>
        </Modal>
      </>
    )
  }

  function BildModal(lied, quelle, bild_existiert) {
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const image_src = get_image_source(lied, quelle);

    return (
      <>
        {(!bild_existiert) ? (
          <Button href="#" onClick={handleShow} disabled>Noten</Button>
        ) : (
          <Button href="#" onClick={handleShow}>Noten</Button>
        )}

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
            src={image_src} 
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
        // console.log(data)
      }
    ).then(
      get_song_rating()
    ).then(
      get_competition_history()
    )
  }

  async function get_competition_history() {
    fetch("/api/load_competition_history").then(
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
  }

  async function get_song_rating() {
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
  }

  useEffect(() => {
    get_competition_history()
  }, [])

  useEffect(() => {
    get_song_rating()
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
        // console.log(data)
        setData(data)
      }
    )
  }, [])

  return (
    <Container fluid="md">
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
                    video_src={lied[0].Videolink}
                  />
                  <SongCard
                    lied={lied[1].Liedanfang}
                    quelle={lied[1].Quelle}
                    seite={lied[1].Seite}
                    video_src={lied[1].Videolink}
                  />
                </CardGroup>
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
      </Tabs>
    </Container>
  )
}

export default App