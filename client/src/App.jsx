import React, { useState, useEffect, useCallback } from "react";
import DataTable2 from 'react-data-table-component';
import NetworkGraph from './NetworkGraph';

import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Button as Button2 } from 'primereact/button';
import { Column } from 'primereact/column';
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

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
import Form from 'react-bootstrap/Form';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function slugify(s) {
  if (typeof s === 'string') {
    return s.toLowerCase().replaceAll(" ", "_").replaceAll(/[',]/g, "");
  }
  return s;
}

function buildImagePath(item, itemCfg) {
  const { path_template, slugify: doSlug } = itemCfg.image;
  let result = path_template;
  itemCfg.key_fields.forEach(f => {
    result = result.replaceAll(`{${f}}`, doSlug ? slugify(item[f]) : item[f]);
  });
  return result;
}

function makeKey(item, itemCfg) {
  return itemCfg.key_fields.map(f => item[f]).join(itemCfg.key_separator);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ImageModal({ title, src, show, onHide }) {
  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Image src={src} fluid className="modal-height-limit" />
      </Modal.Body>
    </Modal>
  );
}

function VideoModalButton({ title, videoSrc }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button href="#" onClick={() => setShow(true)} disabled={!videoSrc}>Video</Button>
      <Modal show={show} onHide={() => setShow(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <iframe
            src={videoSrc}
            width="100%"
            className="responsiveVideoEmbedding"
            title="video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </Modal.Body>
      </Modal>
    </>
  );
}

function ImageModalButton({ title, imageSrc, imageExists, buttonLabel }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button href="#" onClick={() => setShow(true)} disabled={!imageExists}>
        {buttonLabel || "Image"}
      </Button>
      {imageExists && (
        <ImageModal title={title} src={imageSrc} show={show} onHide={() => setShow(false)} />
      )}
    </>
  );
}

/**
 * ItemCard — generic comparison card driven entirely by itemCfg.
 */
function ItemCard({ item, itemCfg, onVote }) {
  const [showImageModal, setShowImageModal] = useState(false);

  const displayName = item[itemCfg.display_name_field];
  const key = makeKey(item, itemCfg);

  const imageEnabled = itemCfg.image?.enabled;
  const imageSrc = imageEnabled ? buildImagePath(item, itemCfg) : null;
  const imageExists = imageEnabled ? (item.BildExistiert ?? false) : false;

  const videoEnabled = itemCfg.video?.enabled;
  const videoSrc = videoEnabled ? item[itemCfg.video.field] : null;

  return (
    <>
      <Card>
        {imageEnabled && imageExists && (
          <a href="#" onClick={(e) => { e.preventDefault(); setShowImageModal(true); }}>
            <Card.Img variant="top" src={imageSrc} />
          </a>
        )}
        <Card.Header className="d-grid">
          <Button variant="primary" size="lg" onClick={() => onVote(key)}>
            {displayName}
          </Button>
        </Card.Header>
        <CardBody>
          {videoEnabled && (
            videoSrc
              ? <iframe src={videoSrc} title="video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              : <Card.Text>{itemCfg.video.no_video_label}</Card.Text>
          )}
          <Table striped bordered hover>
            <tbody>
              {itemCfg.card_fields.map(cf => (
                <tr key={cf.field}>
                  <th>{cf.label}:</th>
                  <td>{item[cf.field]}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {imageEnabled && (
        <ImageModal
          title={displayName}
          src={imageSrc}
          show={showImageModal}
          onHide={() => setShowImageModal(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Dynamic table column builder
// ---------------------------------------------------------------------------

function buildTableColumns(itemCfg, uniqueSources) {
  return itemCfg.table_columns.map((col, idx) => {
    const displayName = (item) => item[itemCfg.display_name_field];

    if (col.type === "image") {
      if (!itemCfg.image?.enabled) return null;
      return (
        <Column
          key={idx}
          header={col.header}
          body={(row) => (
            <ImageModalButton
              title={displayName(row)}
              imageSrc={buildImagePath(row, itemCfg)}
              imageExists={row.BildExistiert}
              buttonLabel={itemCfg.image.button_label}
            />
          )}
        />
      );
    }

    if (col.type === "video") {
      if (!itemCfg.video?.enabled) return null;
      return (
        <Column
          key={idx}
          header={col.header}
          body={(row) => (
            <VideoModalButton
              title={displayName(row)}
              videoSrc={row[itemCfg.video.field]}
            />
          )}
        />
      );
    }

    if (col.type === "checkbox") {
      return (
        <Column
          key={idx}
          field={col.field}
          header={col.header}
          sortable={col.sortable}
          body={(row) => (
            <Form>
              <Form.Check disabled type="checkbox" checked={!!row[col.field]} readOnly />
            </Form>
          )}
          filter
          filterMatchMode="equals"
          showFilterMatchModes={false}
          showAddButton={false}
          showFilterOperator={false}
          filterElement={(options) => (
            <div className="flex align-items-center gap-2">
              <Button2 type="button" label="Alle" onClick={() => options.filterCallback(null)}
                className={options.value === null ? 'p-button-outlined' : 'p-button-text'} />
              <Button2 type="button" label="✓" onClick={() => options.filterCallback(1)}
                className={options.value === 1 ? 'p-button-outlined' : 'p-button-text'} />
              <Button2 type="button" label="✗" onClick={() => options.filterCallback(0)}
                className={options.value === 0 ? 'p-button-outlined' : 'p-button-text'} />
            </div>
          )}
          style={{ width: '8%' }}
        />
      );
    }

    if (col.filter_type === "text") {
      return (
        <Column
          key={idx}
          field={col.field}
          header={col.header}
          sortable={col.sortable}
          filter
          filterPlaceholder={`Search ${col.header}`}
          style={{ width: '20%' }}
        />
      );
    }

    if (col.filter_type === "dropdown") {
      const opts = uniqueSources[col.field] || [];
      return (
        <Column
          key={idx}
          field={col.field}
          header={col.header}
          sortable={col.sortable}
          filter
          filterMatchMode="equals"
          showFilterMatchModes={false}
          showAddButton={false}
          showFilterOperator={false}
          filterElement={(options) => (
            <Dropdown
              value={options.value}
              options={opts}
              onChange={(e) => options.filterCallback(e.value)}
              placeholder={`Filter ${col.header}`}
              className="p-column-filter"
            />
          )}
          style={{ width: '15%' }}
        />
      );
    }

    // Default: plain sortable column
    return (
      <Column
        key={idx}
        field={col.field}
        header={col.header}
        sortable={col.sortable}
      />
    );
  }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

function App() {
  const [appConfig, setAppConfig] = useState(null);

  const [competitionData, setCompetitionData] = useState();
  const [competitionRecords, setCompetitionRecords] = useState();

  const [itemData, setItemData] = useState();
  const [itemRecords, setItemRecords] = useState();
  const [uniqueSources, setUniqueSources] = useState({});

  const [currentPair, setCurrentPair] = useState([]);
  const [networkData, setNetworkData] = useState(null);

  // ---- helpers that depend on config ----

  const getUniqueSources = useCallback((data, cfg) => {
    if (!data || !cfg) return {};
    const result = {};
    cfg.item.table_columns.forEach(col => {
      if (col.filter_type === 'dropdown' && col.field) {
        const values = [...new Set(data.map(row => row[col.field]))];
        result[col.field] = values.map(v => ({ label: v, value: v }));
      }
    });
    return result;
  }, []);

  // ---- API calls ----

  const get_item_rating = useCallback(() => {
    fetch("/api/load_item_rating")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        setItemData(data);
        setItemRecords(data);
        setUniqueSources(prev => {
          // recompute using latest appConfig via closure capture below
          return prev;
        });
        // update uniqueSources here by calling the helper directly
        setAppConfig(cfg => {
          if (cfg) setUniqueSources(getUniqueSources(data, cfg));
          return cfg;
        });
      });
  }, [getUniqueSources]);

  const get_competition_history = useCallback(() => {
    fetch("/api/load_competition_history")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        setCompetitionData(data);
        setCompetitionRecords(data);
      });
  }, []);

  const get_first_competition = useCallback(() => {
    fetch("/api/get_first_competition")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCurrentPair(data); });
  }, []);

  const get_network_data = useCallback(() => {
    fetch("/api/network_data")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setNetworkData(data); });
  }, []);

  async function post_winner(key) {
    fetch("/api/declare_competition_winner", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(key),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCurrentPair(data); })
      .then(() => get_item_rating())
      .then(() => get_competition_history());
  }

  async function skip_competition() {
    fetch("/api/skip_competition")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCurrentPair(data); });
  }

  async function reset_competition_queue() {
    fetch("/api/reset_competition_queue")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCurrentPair(data); });
  }

  // ---- Filter helpers ----

  function handleFilter(fullData, setRecords, event) {
    const q = event.target.value.toLowerCase();
    setRecords(fullData.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    ));
  }

  // ---- Bootstrap (load config first, then data) ----

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(cfg => setAppConfig(cfg));
  }, []);

  useEffect(() => {
    if (!appConfig) return;
    get_item_rating();
    get_competition_history();
    get_first_competition();
    get_network_data();
  }, [appConfig, get_item_rating, get_competition_history, get_first_competition, get_network_data]);

  // ---- Competition history table columns (always fixed) ----

  const competitionColumns = [
    { name: 'Datum',    selector: row => row.Datum,    sortable: true },
    { name: 'Gewinner', selector: row => row.Gewinner, sortable: true },
    { name: 'Verlierer',selector: row => row.Verlierer,sortable: true },
  ];

  const customStyles = {
    headCells: { style: { fontSize: '1.25rem', fontWeight: 550 } },
    cells:     { style: { fontSize: '1rem' } },
  };

  // ---- Guard: wait for config ----

  if (!appConfig) {
    return <Container fluid="md"><p>Loading configuration…</p></Container>;
  }

  const { app: appLabels, item: itemCfg, network: networkCfg = {} } = appConfig;

  return (
    <Container fluid="md">
      <Tabs defaultActiveKey="competition" id="" className="mb-3">

        {/* ---- Comparison tab ---- */}
        <Tab eventKey="competition" title={appLabels.tab_competition || "Rate next!"}>
          <Row id="competition">
            {currentPair.length < 2 ? (
              <p>Loading…</p>
            ) : (
              <div>
                <h2 className="text-center">{appLabels.comparison_question}</h2>
                <CardGroup>
                  <ItemCard item={currentPair[0]} itemCfg={itemCfg} onVote={post_winner} />
                  <ItemCard item={currentPair[1]} itemCfg={itemCfg} onVote={post_winner} />
                </CardGroup>
                <ButtonGroup aria-label="actions" className="mt-2">
                  <Button variant="outline-primary" size="lg" onClick={skip_competition}>
                    {appLabels.skip_button_label || "Skip"}
                  </Button>
                  <Button variant="outline-primary" size="lg" onClick={reset_competition_queue}>
                    {appLabels.reset_button_label || "Reset queue"}
                  </Button>
                </ButtonGroup>
              </div>
            )}
          </Row>
        </Tab>

        {/* ---- Ranking table tab ---- */}
        <Tab eventKey="ranking" title={appLabels.tab_ranking || "Ranking"}>
          <Row id="itemData">
            {typeof itemData === 'undefined' ? (
              <p>Loading…</p>
            ) : (
              <DataTable
                value={itemRecords}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 20]}
                tableStyle={{ minWidth: '50rem' }}
                stripedRows
                showGridlines
                filterDisplay="menu"
              >
                {buildTableColumns(itemCfg, uniqueSources)}
              </DataTable>
            )}
          </Row>
        </Tab>

        {/* ---- History tab ---- */}
        <Tab eventKey="competition-history" title={appLabels.tab_history || "History"}>
          <Row id="competitionTable">
            {typeof competitionData === 'undefined' ? (
              <p>Loading…</p>
            ) : (
              <div>
                <div>
                  <span>{appLabels.history_search_label || "Search"}: </span>
                  <input
                    type="text"
                    onChange={(e) => handleFilter(competitionData, setCompetitionRecords, e)}
                  />
                </div>
                <DataTable2
                  columns={competitionColumns}
                  data={competitionRecords}
                  customStyles={customStyles}
                  theme="light"
                  fixedHeader
                  pagination
                />
              </div>
            )}
          </Row>
        </Tab>

        {/* ---- Network tab ---- */}
        <Tab eventKey="network" title={networkCfg.tab_label || "Network"}>
          <Row id="networkGraph">
            <NetworkGraph networkData={networkData} />
          </Row>
        </Tab>

      </Tabs>
    </Container>
  );
}

export default App;
