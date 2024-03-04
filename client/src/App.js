import React, { useState, useEffect } from "react";
import DataTable from 'react-data-table-component';


function App() {

  const [data, setData] = useState()

  const [records, setRecords] = useState()

  const columns = [
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

  const customStyles = {
    rows: {
      style: {
        minHeight: '72px', // override the row height
      },
    },
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

  function handleFilter(event) {
    const newData = data.filter(row => {
      return (
        row.Gewinner.toLowerCase().includes(event.target.value.toLowerCase()) || 
        row.Verlierer.toLowerCase().includes(event.target.value.toLowerCase())
      )
    })
    setRecords(newData)
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
        setData(data)
        setRecords(data)
        console.log(data)
      }
    )
  }, [])

  return (
    <div>

      {(typeof data === 'undefined') ? (
        <p>Loading...</p>
      ) : (
        <div>
          <div>
            <span>Suche Lied: </span><input type="text" onChange={handleFilter}></input>
          </div>
          <DataTable
            columns={columns}
            data={records}
            customStyles={customStyles}
            theme="light"
            fixedHeader
            pagination
          ></DataTable>
        </div>
      )}

    </div>
  )
}

export default App