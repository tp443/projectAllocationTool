/**
 * Client-side Javascript file - this is the client side interface for importing and exporting files
 * @author tmep
 * @date Aug 2018
 * @module static/importAndExport
 */

// -----------------------------------------------------------------------------------------------------------------------
// Importing, exporting and saving data
// -----------------------------------------------------------------------------------------------------------------------

/**
 * @function sortProjectAllocation -  sort array before exporting
 */

var sortProjectAllocation = function(sortedBy) {
  return function(a, b) {
    if (a[sortedBy].toLowerCase() > b[sortedBy].toLowerCase()) {
      return 1;
    } else if (a[sortedBy].toLowerCase() < b[sortedBy].toLowerCase()) {
      return -1;
    }
    return 0;
  }
}

/**
 * @function saveJSON -  save data in table and wite a file automatically wihtout having to download
 */

function saveJSON() {
  var allData = {
    'tableData': [],
    'staffData': []
  }

  Object.entries(projectAllocation).forEach(
    ([key, value]) => allData.tableData.push(value)
  );
  Object.entries(facultyStaff).forEach(
    ([key, value]) => allData.staffData.push(value)
  );

  // Create File
  fetch('/writeFile', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        allData
      })
    })
    .then(res => alert("File Saved In Static Folder"))
    .catch(err => console.log("Error: " + err));
}

/**
 * @function importJSON -  Import JSON from automatic save functionality
 */

function importJSON() {
  fetch('/getJSONFile')
    .then(response => response.json())
    .then(dat => {
      createModuleObject();
      convertToStaffObject(dat.staffData);
      convertToProjectAllocationObject(dat.tableData, "inputSavedProgressSetUp");
      $('#addRows').show();
      $('.alert').hide();
      $('#successImport').show();
    })
    .then(refresh => refreshTable(projectAllocation, "allocationTable"))
    .catch(err => console.log(err));
}

/**
 * @function pdfExport - Exports current table to PDF. This uses the auto-table plugin: https://github.com/simonbengtsson/jsPDF-AutoTable
 */

function pdfExport() {
  countProjectsPerSupervisor()
  // Find number of degree options
  let courseOptions = csCourseTitlesImport;
  // Put object into an array
  var tableData = [];
  Object.entries(projectAllocation).forEach(
    ([key, value]) => tableData.push(value)
  );

  var supervisorData = [];
  Object.entries(facultyStaff).forEach(
    ([key, value]) => supervisorData.push(value)
  );

  // Sort by last name
  tableData.sort(sortProjectAllocation("lastName"))
  supervisorData.sort(sortProjectAllocation("lastName"))
  // Add course title abbreivation to pdf notes
  for (var i = 0; i < tableData.length; i++) {
    for (courseTitleKey in courseCatalogue) {
      if (tableData[i]['degreeIntention'] == courseTitleKey) {
        tableData[i]['notes'] = courseCatalogue[courseTitleKey]["abbreviation"]
      }
    }
  }


  /**
   * @function getCourseStudents -  Filter all CS students into their sepeare courses
   * @param {string} inputtedData - data source
   * @param {string} course -  Course number out of the avaible course.
   * @return {array} All students on that disseration code
   */

  function getCourseStudents(inputtedData, course) {
    let data = inputtedData
    let studentsInCourse = []
    for (var i = 0; i < tableData.length; i++) {
      if (tableData[i]['dissCode'] == course) {
        studentsInCourse.push(tableData[i])
      }
    }
    return studentsInCourse
  }

  /**
   * @function createPDF -  Define PDF formatting
   */

  function createPDF() {
    var headerIds = arrayOfKeys(projectAllocation);
    var supervisorHeaderIds = arrayOfKeys(facultyStaff);
    let availableModules = returnUniqueDissModules()


    /**
     * @function getColumns -  Columns to display for student breakdown
     * @return {array} Columns to display
     * Has to be hard coded in order to restrict certain infromation being leaked
     */

    var getColumns = function() {
      return [{
          title: "FORENAME",
          dataKey: "firstName"
        },
        {
          title: "SURNAME",
          dataKey: "lastName"
        },
        {
          title: "PROJECT",
          dataKey: "projectTitle"
        },
        {
          title: "SUPERVISOR",
          dataKey: "supervisor"
        },
        {
          title: "2ND MARKER",
          dataKey: "secondMarker"
        },
        {
          title: "NOTES",
          dataKey: "notes"
        },
      ];
    }

    /**
     * @function getSupervisorColumns -  getsupervisor columns
     * @return {array} Columns to display
     * Initially hard coded and then dissertion codes are dynamically added
     */
    var getSupervisorColumns = function() {

      var columns = [{
          title: "FORENAME",
          dataKey: "firstName"
        },
        {
          title: "SURNAME",
          dataKey: "lastName"
        },
        {
          title: "SH LOAD",
          dataKey: "sh_load"
        },
        {
          title: "TOTAL",
          dataKey: "total"
        },
        {
          title: "NOTES",
          dataKey: "notes"
        }
      ];

      // Insert modules. Have to do it backaward in order to do it in order.
      for (var j = availableModules.length - 1; j > 0; j--) {
        let array = {
          "title": availableModules[j].toUpperCase(),
          "dataKey": availableModules[j]
        }
        columns.splice(2, 0, array);
      }

      return columns
    }

    // "l" means landscape
    var doc = new jsPDF("l");
    doc.setFontSize(12);
    doc.setFontStyle('bold');
    // Cycle through tables
    var counter = 0;
    for (var key in courseOptions) {
      // Only display courses if they have students enrolled in them
      let tableLength = getCourseStudents(tableData, courseOptions[key].toUpperCase()).length
      if (tableLength > 0) {
        if (counter != 0) {
          doc.addPage();
        }
        ++counter
        doc.text("Code: " + courseOptions[key] + " - " + key, 20, 20);
        doc.autoTable(getColumns(), getCourseStudents(tableData, courseOptions[key].toUpperCase()), {
          startY: 30,
          styles: {
            font: 'helvetica',
            lineColor: [44, 62, 80],
            lineWidth: 0.75
          }
        });
      }
    }
    doc.addPage();
    doc.text("Supervisors with agreed projects", 20, 20);
    doc.autoTable(getSupervisorColumns(), supervisorData, {
      startY: 30,
      styles: {
        font: 'helvetica',
        lineColor: [44, 62, 80],
        lineWidth: 0.75
      }
    });

    doc.save('MSc_DESEM.pdf');
  };

  createPDF()
};

/**
 * @function convertToCSV - Exports current table to CSV. Used as inspiration - https://stackoverflow.com/questions/8847766/how-to-convert-json-to-csv-format-and-store-in-a-variable
 * @param {array} array - array of object to convert into CSV
 * @param {array} headers - array of headers for the csv file
 * @return {string} converted object in csv format
 */

function convertToCSV(array, headers) {
  const items = JSON.parse(JSON.stringify(array))
  let csv = items.map(row => headers.map(fieldName => JSON.stringify(row[fieldName])).join(','))
  csv.unshift(headers.join(','))
  csv = csv.join('\r\n')
  return csv
}

/**
 * @function convertToJSON - Exports csv to JSON - paraphrased from https://gist.github.com/iwek/7154578
 * @param {string} csv - csv string to be converted to json
 * @param {string} file - csv file name
 * @return {string} converted object in JSON format
 */

function convertToJSON(csv, file) {
  var lines = csv.split("\n");
  var result = [];
  var headers = lines[0].split(",");
  console.log(headers);
  var validation = true;
  var csvHeaderDictionary
  // Check csv file has headers whcih match up with the dictionary defined at the beginning
  if (file == "sup-upload" || file == "addSupervisorRow") {
    csvHeaderDictionary = csvSupervisorHeaders
  } else if (file == "stu-upload" || file == "addStudentRow") {
    csvHeaderDictionary = csvStudentHeaders
  }
  for (var i = 0; i < headers.length - 1; i++) {
    if (headers[i] != csvHeaderDictionary[i]) {
      validation = false;
    }
  }
  if (validation == true) {
    for (var i = 1; i < lines.length - 1; i++) {
      var obj = {};
      var currentline = lines[i].split(",");
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentline[j];
      }
      result.push(obj);
    }
    //return result; //JavaScript object
    return JSON.parse(JSON.stringify(result)); //JSON
  } else {
    return
  }
}

/**
 * @function convertTableToCSV - Convert all infromation into a format sutiable to be converted into CSV
 * @param {object} object - object to turn into csv
 * @param {string} name - name of saved file
 */

function convertTableToCSV(object, name) {
  let tableData = [];
  Object.entries(object).forEach(
    ([key, value]) => tableData.push(value)
  );
  tableData.sort(sortProjectAllocation("lastName"))
  let headers = arrayOfKeys(object);
  let csv = convertToCSV(tableData, headers)
  exportCSVFile("export" + name, csv)
}

/**
 * @function mmsGroupsCSVExport - Convert to infromation in the table to a format suitbale for MMS i.e:  username, group name, left the module
 */

function mmsGroupsCSVExport() {
  var studentsMMS = [];
  // Push through object into each array
  for (var key in projectAllocation) {
    var obj = projectAllocation[key];
    var name = obj["firstName"] + " " + obj["lastName"];
    studentsMMS.push({
      "# username": key,
      ' group name': name,
      ' left the module': false
    })
  }

  if (studentsMMS == "") {
    alert("There are no students in this allocation process. Please import a file to start.")
  } else {
    let headers = ["# username", ' group name', ' left the module']
    let csv = convertToCSV(studentsMMS, headers)
    exportCSVFile("exportGroupsForMMS", csv)
  }
}


/**
 * @function mmsSupervisorsCSVExport - Convert  infromation in the table to a format suitable for MMS i.e: supervisor username, group name, role
 */

function mmsSupervisorsCSVExport() {
  var supervisorsMMS = [];
  // Push through object into each array
  for (var key in projectAllocation) {
    var obj = projectAllocation[key];
    var roles = []
    var group = key;

    // Locate name in each cell
    var studentName = obj["firstName"] + " " + obj["lastName"];
    var supervisor = obj["supervisor"];
    var secondSupervisor = obj["secondSupervisor"];
    var marker = obj['secondMarker']
    // Convert names to usernames - not an efficinet way as if someone has the same given and last name the wrong user naem might be given
    for (staff in facultyStaff) {
      let item = facultyStaff[staff]
      if (item['firstName'] + " " + item["lastName"] == supervisor) {
        supervisor = staff;
      } else if (item['firstName'] + " " + item["lastName"] == secondSupervisor) {
        secondSupervisor = staff;
      } else if (item['firstName'] + " " + item["lastName"] == marker) {
        marker = staff;
      }
    }
    // One makes an object if name is in a cell
    if (supervisor != "") {
      supervisorsMMS.push({
        "# supervisor username": supervisor,
        ' group name': studentName,
        ' role': "Supervisor"
      })
    }
    if (secondSupervisor != "") {
      supervisorsMMS.push({
        "# supervisor username": secondSupervisor,
        ' group name': studentName,
        ' role': "Second Supervisor"
      })
    }
    if (marker != "") {
      supervisorsMMS.push({
        "# supervisor username": marker,
        ' group name': studentName,
        ' role': "Marker"
      })
    }
  }
  if (supervisorsMMS == "") {
    alert("No roles have been assigned. Please assign roles before downloading file")
  } else {
    let headers = ["# supervisor username", ' group name', ' role']
    let csv = convertToCSV(supervisorsMMS, headers)
    exportCSVFile("exportSupervisorsForMMS", csv)
  }
}

/**
 * @function exportCSVFile - Exporting CSV file without server side or using npm packages.Paraphrased: https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side and https://medium.com/@danny.pule/export-json-to-csv-file-using-javascript-a0b7bc5b00d2
 * @param {string} docName - What to name the saved file
 * @param {string} csv -  inputted csv to convert to saved file
 */

function exportCSVFile(docName, csv) {

  var exportedFilenmae = docName + '.csv';

  var blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  });
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, exportedFilenmae);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportedFilenmae);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}



/**
 * @function createVisulisation - Create Visulisation displays infomraiton on who has been allocated
 * Inspiration: https://c3js.org/samples/chart_bar_stacked.html
 */


function createVisulisation() {

  var tableData = [];
  Object.entries(projectAllocation).forEach(
    ([key, value]) => tableData.push(value)
  );


  /**
   * @function createBarChart - Creates a bar chart displaying the number of not allocted cells in the table for each column
   */

  function createBarChart() {

    // Infromation for Bar Chart;
    var allocated = ["Allocated"];
    var notAllocated = ["Not allocated"];
    var keyTitles = [];
    var barChartLabels = [];
    // All the headers available
    var headers = $(".primaryHeaders").map(function() {
      keyTitles.push($(this).text());
    });

    // set counters and table keys to access correct infromation
    var countCol = [];
    var tableKeys = arrayOfKeys(projectAllocation);

    for (var i = 6; i < 10; i++) {
      countCol[i] = 0
      for (var j = 0; j < tableData.length; j++) {
        if (tableData[j][tableKeys[i]] != "") {
          countCol[i]++
        }
      }

      barChartLabels.push(keyTitles[i]);
      allocated.push(countCol[i]);
      notAllocated.push(tableData.length - countCol[i] - 2);
    }

    var chart = c3.generate({
      bindto: '#chart',
      size: {
        height: 500,
        width: 700
      },
      data: {
        columns: [
          allocated,
          notAllocated,
        ],
        type: 'bar',
        colors: {
          'Allocated': '#33cc33',
          'Not allocated': '#ff0000'
        },
        groups: [
          [allocated[0], notAllocated[0]]
        ]
      },
      grid: {
        x: {
          show: true
        },
        y: {
          show: true
        }
      },
      axis: {
        x: {
          type: 'category',
          categories: barChartLabels
        }
      },
    });
  }

  /**
   * @function createPieChart - Creates a pie chart displaying the number of fullly/semi/not complete rows
   */

  function createPieChart() {

    // set counters and table keys to access correct infromation
    var countGreen = 0;
    var countAmber = 0;
    var countRed = 0;
    var tableKeys = arrayOfKeys(projectAllocation);
    for (var i = 6; i < 7; i++) {
      for (var j = 0; j < tableData.length; j++) {
        if (tableData[j][tableKeys[i]] != "" && tableData[j][tableKeys[i + 1]] != "") {
          countGreen++
        } else if (tableData[j][tableKeys[i]] == "" && tableData[j][tableKeys[i + 1]] != "") {
          countAmber++
        } else if (tableData[j][tableKeys[i]] == "" && tableData[j][tableKeys[i + 1]] == "") {
          countRed++;
        }
      }
    }

    var pieChart = c3.generate({
      bindto: '#pieChart',
      size: {
        height: 400,
        width: 600
      },
      data: {
        // iris data from R
        columns: [
          ['Supervisor and Project Allocated', countGreen],
          ['Just Supervisor Allocated', countAmber],
          ['Not Allocated', countRed],
        ],
        type: 'pie',
        colors: {
          'Supervisor and Project Allocated': '#33cc33',
          'Just Supervisor Allocated': '#ffcc00',
          'Not Allocated': '#ff0000'
        },
      }
    });
  }
  createBarChart()
  createPieChart()
}


/**
 * @function convertToProjectAllocationObject -so user can input data into cell with autocomplete functionality
 * @param {string} importedData - imported json data
 * @param {string} inputID - HTML id of import button
 */
function convertToProjectAllocationObject(importedData, inputID) {
  projectAllocation = [];
  if (importedData == undefined) {
    alert("Please upload a Project Allocation Formatted File. The file name could be ProjectAllocation.json")
  } else {
    for (var i = 0; i < importedData.length; i++) {
      projectAllocation[importedData[i].username] = importedData[i];
    }
    if (inputID != "inputSavedProgressSetUp") {
      refreshTable(projectAllocation, "allocationTable");
    } else if (inputID = "inputSavedProgressSetUp") {
      $('.alert-danger').hide();
      assignCourseCodes()
      // Create Table
      initialisationTable()
    }
  }
}


/**
 * @function convertToStaffObject -so user can input data into cell with autocomplete functionality
 * @param {string} importedData - imported json data
 */
function convertToStaffObject(importedData) {
  facultyStaff = [];
  if (importedData != undefined) {
    for (var i = 0; i < importedData.length; i++) {
      facultyStaff[importedData[i].username] = importedData[i];
    }
  }
}

// Number of csv files imported

var count = 0;
/**
 * @function handleFiles - When a user inputs previosuly saved data
 */

function handleFiles(inputID) {

  // Locate input file
  file = document.querySelector('input[id=' + inputID + ']').files[0];


  /**
   * @function FileReader -reads the contents of a Blob or File.
   * @param {object}
   */
  //the file reader object reads and specifies the image file
  var reader = new FileReader();
  //reads the data as URL
  reader.readAsText(file);
  //reader.onloadend grabs the image data required for posting
  reader.onloadend = function() {
    var result = event.target.result

    // Input saved file
    if (inputID == "inputSavedProgressSetUp") {
      if (file.type === "application/json") {
        let resultJSON = JSON.parse(result)
        // Create objeects
        createModuleObject()
        convertToStaffObject(resultJSON.staffData)
        convertToProjectAllocationObject(resultJSON.tableData, inputID)
        $('#addRows').show()
        $('.alert').hide();
        $('#successDownloadedFile').show()
      } else {
        alert("Please upload a JSON format file")
        // Import saved data when the use has already been through the set up page
      }

      // Input saved file from proejct allocation page
    } else if (inputID == "inputSavedProgressMidWay") {
      let resultJSON = JSON.parse(result)
      convertToProjectAllocationObject(resultJSON.tableData, inputID)
      convertToStaffObject(resultJSON.staffData)
      countProjectsPerSupervisor();
      createFilterDropdown();
      $('#addRows').show()

      // add rows to either supervisors or students

    } else if (inputID == "addStudentRow") {

      var data = convertToJSON(result, inputID);
      if (data && data.length > 0) {
        checkMissingRows("projectAllocation", projectAllocation, data)
        $('#progressMessageInput-' + inputID + '-failure').hide();
      } else {
        $('#progressMessageInput-' + inputID + '-failure').show();
      }
    } else if (inputID == "addSupervisorRow") {
      var data = convertToJSON(result, inputID);
      if (data && data.length > 0) {
        checkMissingRows("facultyStaff", facultyStaff, data)
        $('#progressMessageInput-' + inputID + '-failure').hide();
      } else {
        $('#progressMessageInput-' + inputID + '-failure').show();
      }
    }

    // Input from start using CSV files
    else {
      // Remove quotation marks
      let importedData = result.replace(/['"]+/g, '');
      var data = convertToJSON(importedData, inputID);
      if (data && data.length > 0) {
        if (inputID == "sup-upload") {
          facultyStaffImport = data;
          count++
        } else if (inputID == "stu-upload") {
          studentImport = data;
          count++
        }
        // Success indicators
        $('#progressMessageInput-' + inputID).show()
        $('#progressMessageInput-' + inputID + '-failure').hide()
        // If both files are uploaded
        if (count == 2) {
          $('.alert-danger').hide();
          $('#successCV').show();
          initialisationObjects();
          initialisationTable();
          $('#addRows').show()
          count = 0;
        }
        // If error
      } else {
        $('#progressMessageInput-' + inputID + '-failure').show();
      }
    }
  }
}


/**
 * @function downloadProgress - downlaod objects into JSon format. Similar style was used (https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server)
 */

function downloadProgress() {
  var allData = {
    'tableData': [],
    'staffData': []
  }

  Object.entries(projectAllocation).forEach(
    ([key, value]) => allData.tableData.push(value)
  );
  Object.entries(facultyStaff).forEach(
    ([key, value]) => allData.staffData.push(value)
  );

  let filename = "ProjectAllocation.json"
  let file = JSON.stringify(allData)

  // HTML 5 ready files due to it using the downlaod attribute of the <a> element.
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(file));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
