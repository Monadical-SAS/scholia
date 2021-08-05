// https://stackoverflow.com/questions/6020714
function escapeHTML(html) {
    if (typeof html !== "undefined") {
        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    else {
        return "";
    }
}

// http://stackoverflow.com/questions/1026069/
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


function convertDataTableData(data, columns, linkPrefixes = {}, linkSuffixes = {}) {
    // Handle 'Label' columns.

    // var linkPrefixes = (options && options.linkPrefixes) || {};

    var convertedData = [];
    var convertedColumns = [];
    for (var i = 0; i < columns.length; i++) {
        column = columns[i];
        if (column.substr(-11) == 'Description') {
            convertedColumns.push(column.substr(0, column.length - 11) + ' description');
        } else if (column.substr(-5) == 'Label') {
            // pass
        } else if (column.substr(-3) == 'Url') {
            // pass
        } else {
            convertedColumns.push(column);
        }
    }
    for (var i = 0 ; i < data.length ; i++) {
	var convertedRow = {};
	for (var key in data[i]) {
	    if (key.substr(-11) == 'Description') {
		convertedRow[key.substr(0, key.length - 11) + ' description'] = data[i][key];

	    } else if (
			key + 'Label' in data[i] &&
			/^http/.test(data[i][key]) &&
			data[i][key].length > 30
	    ) {
		convertedRow[key] = '<a href="' +
		    (linkPrefixes[key] || "../") + 
		    data[i][key].substr(31) +
            (linkSuffixes[key] || "") +
		    '">' + data[i][key + 'Label'] + '</a>';
	    } else if (key.substr(-5) == 'Label') {
		// pass
		
	    } else if (key + 'Url' in data[i]) {
		convertedRow[key] = '<a href="' +
		    data[i][key + 'Url'] +
		    '">' + data[i][key] + '</a>';
	    } else if (key.substr(-3) == 'Url') {
		// pass

	    } else if (key.substr(-3) == 'url') {
		// Convert URL to a link
		convertedRow[key] = "<a href='" +
		    data[i][key] + "'>" + 
		    $("<div>").text(data[i][key]).html() + '</a>';

	    } else if (key == 'orcid') {
		// Add link to ORCID website
		convertedRow[key] = '<a href="https://orcid.org/' +
		    data[i][key] + '">' + 
		    data[i][key] + '</a>';

	    } else if (key == 'doi') {
		// Add link to Crossref
		convertedRow[key] = '<a href="https://doi.org/' +
		    encodeURIComponent(data[i][key]) + '">' +
		    $("<div>").text(data[i][key]).html() + '</a>';
	    } else {
		convertedRow[key] = data[i][key];
	    }
	}
	convertedData.push(convertedRow);
    }
    return { data: convertedData, columns: convertedColumns }
}


function entityToLabel(entity, language = 'en') {
    if (language in entity['labels']) {
        return entity['labels'][language].value;
    }

    // Fallback
    languages = ['en', 'da', 'de', 'es', 'fr', 'jp',
        'nl', 'no', 'ru', 'sv', 'zh'];
    for (lang in languages) {
        if (lang in entity['labels']) {
            return entity['labels'][lang].value;
        }
    }

    // Last resort
    return entity['id']
}

function resize(element) {
    //width = document.getElementById("topics-works-matrix").clientWidth;
    width = $(element)[0].clientWidth;
    d3.select(element).attr("width", width);
    console.log("resized with width " + width);
}


function sparqlToResponse(sparql, doneCallback) {
    var endpointUrl = "https://query.wikidata.org/bigdata/namespace/wdq/sparql";
    var settings = {
        headers: { Accept: "application/sparql-results+json" },
        data: { query: sparql }
    };
    return $.ajax(endpointUrl, settings).then(doneCallback);
}


function sparqlDataToSimpleData(response) {
    // Convert long JSON data from from SPARQL endpoint to short form
    let data = response.results.bindings;
    let columns = response.head.vars
    var convertedData = [];
    for (var i = 0; i < data.length; i++) {
        var convertedRow = {};
        for (var key in data[i]) {
            convertedRow[key] = data[i][key]['value'];
        }
        convertedData.push(convertedRow);
    }
    return { data: convertedData, columns: columns };
}


function sparqlToDataTable(sparql, element, options = {}) {
    // Options: linkPrefixes={}, linkSuffixes={}, paging=true
    var linkPrefixes = (typeof options.linkPrefixes === 'undefined') ? {} : options.linkPrefixes;
    var linkSuffixes = (typeof options.linkSuffixes === 'undefined') ? {} : options.linkSuffixes;
    var paging = (typeof options.paging === 'undefined') ? true : options.paging;
    var sDom = (typeof options.sDom === 'undefined') ? 'lfrtip' : options.sDom;
    var url = "https://query.wikidata.org/bigdata/namespace/wdq/sparql?query=" +
        encodeURIComponent(sparql) + '&format=json';

    $.getJSON(url, function (response) {
        var simpleData = sparqlDataToSimpleData(response);

        convertedData = convertDataTableData(simpleData.data, simpleData.columns, linkPrefixes = linkPrefixes, linkSuffixes = linkSuffixes);
        columns = [];
        for (i = 0; i < convertedData.columns.length; i++) {
            var column = {
                data: convertedData.columns[i],
                title: capitalizeFirstLetter(convertedData.columns[i]).replace(/_/g, "&nbsp;"),
                defaultContent: "",
            }
            columns.push(column)
        }

    if (convertedData.data.length <= 10) {
        paging = false;
    }

	table = $(element).DataTable({ 
	    data: convertedData.data,
	    columns: columns,
	    lengthMenu: [[10, 25, 100, -1], [10, 25, 100, "All"]],
	    ordering: true,
	    order: [], 
	    paging: paging,
	    sDom: sDom,
	});

	$(element).append(
	    '<caption><a href="https://query.wikidata.org/#' + 
		encodeURIComponent(sparql) +	
		'">Edit on query.Wikidata.org</a></caption>');
    });
}


function sparqlToDataTablePost(sparql, element, filename, options = {}) {
    // Options: linkPrefixes={}, paging=true
    var linkPrefixes = (typeof options.linkPrefixes === 'undefined') ? {} : options.linkPrefixes;
    var linkSuffixes = (typeof options.linkSuffixes === 'undefined') ? {} : options.linkSuffixes;
    var paging = (typeof options.paging === 'undefined') ? true : options.paging;
    var sDom = (typeof options.sDom === 'undefined') ? 'lfrtip' : options.sDom;
    var url = "https://query.wikidata.org/sparql";

    $.post(url, data = { query: sparql }, function (response, textStatus) {
        var simpleData = sparqlDataToSimpleData(response);

        convertedData = convertDataTableData(simpleData.data, simpleData.columns, linkPrefixes = linkPrefixes, linkSuffixes = linkSuffixes);
        columns = [];
        for (i = 0; i < convertedData.columns.length; i++) {
            var column = {
                data: convertedData.columns[i],
                title: capitalizeFirstLetter(convertedData.columns[i]).replace(/_/g, "&nbsp;"),
                defaultContent: "",
            }
            columns.push(column)
        }
	
        if (convertedData.data.length <= 10) {
          paging = false;
        }

        var table = $(element).DataTable({
            data: convertedData.data,
            columns: columns,
            lengthMenu: [[10, 25, 100, -1], [10, 25, 100, "All"]],
            ordering: true,
            order: [],
            paging: paging,
            sDom: sDom,
        });

        $(element).append(
            '<caption><span style="float:left; font-size:smaller;"><a href="https://query.wikidata.org/#' +
                encodeURIComponent(sparql) +
                '">Wikidata Query Service</a></span>' +
                '<span style="float:right; font-size:smaller;"><a href="https://github.com/WDscholia/scholia/blob/master/scholia/app/templates/' +
                filename + '">' +
                filename.replace("_", ": ") +
                '</a></span></caption>'
        );
    }, "json");
};




function sparqlToDataTable2(sparql, element, filename, options = {}) {
    // Options: linkPrefixes={}, paging=true
    var linkPrefixes = (typeof options.linkPrefixes === 'undefined') ? {} : options.linkPrefixes;
    var linkSuffixes = (typeof options.linkSuffixes === 'undefined') ? {} : options.linkSuffixes;
    var paging = (typeof options.paging === 'undefined') ? true : options.paging;
    var sDom = (typeof options.sDom === 'undefined') ? 'lfrtip' : options.sDom;
    var url = "https://query.wikidata.org/sparql?query=" +
        encodeURIComponent(sparql) + '&format=json';

    $.getJSON(url, function (response) {
        var simpleData = sparqlDataToSimpleData(response);

        convertedData = convertDataTableData(simpleData.data, simpleData.columns, linkPrefixes = linkPrefixes, linkSuffixes = linkSuffixes);
        columns = [];
        for (i = 0; i < convertedData.columns.length; i++) {
            var column = {
                data: convertedData.columns[i],
                title: capitalizeFirstLetter(convertedData.columns[i]).replace(/_/g, "&nbsp;"),
                defaultContent: "",
            }
            if (column['title'] == 'Count') {
              column['render'] = $.fn.dataTable.render.number(',', '.');
              if (i == 0) {
                column['className'] = 'dt-right';
              }
            } else if (
              column['title'] == 'Score' ||
              column['title'] == 'Distance' ||
              /\Wper\W/.test(column['title'])
            ) {
              column['render'] = $.fn.dataTable.render.number(',', '.', 2);
            }
            columns.push(column);
        }
	
        if (convertedData.data.length <= 10) {
            paging = false;
        }

        var table = $(element).DataTable({ 
            data: convertedData.data,
            columns: columns,
            lengthMenu: [[10, 25, 100, -1], [10, 25, 100, "All"]],
            ordering: true,
            order: [],
            paging: paging,
            sDom: sDom,
            language: {
              emptyTable: "This query yielded no results. ",
              sZeroRecords: "This query yielded no results."
            }
        });

        $(element).append(
            '<caption><span style="float:left; font-size:smaller;"><a href="https://query.wikidata.org/#' + 
                encodeURIComponent(sparql) +    
                '">Wikidata Query Service</a></span>' +
                '<span style="float:right; font-size:smaller;"><a href="https://github.com/WDscholia/scholia/blob/master/scholia/app/templates/' +
                filename + '">' +
                filename.replace("_", ": ") +
                '</a></span></caption>'
        );
    });
};


function sparqlToIframe(sparql, element, filename) {
    let $iframe = $(element)
    url = "https://query.wikidata.org/embed.html#" + encodeURIComponent(sparql);
    $iframe.attr('src', url);

    const wikidata_sparql = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(sparql)
    const wikidata_query = "https://query.wikidata.org/#" + encodeURIComponent(sparql)

    $.ajax({
        url: wikidata_sparql,
        success: function (data) {
            let $xml = $(data);
            let results = $xml.find('results')
            if (results.text().trim().length === 0) {
                $iframe.parent().css("display", "none")
                $iframe.parent().after('<hr><p>This query yielded no results. You can still try to find something by ' +
                    '<a href="' + wikidata_query + '" target="_blank">modifying it</a></p>')
            }
            $iframe.parent().after(
                '<span style="float:right; font-size:smaller">' +
                    '<a href="https://github.com/WDscholia/scholia/blob/master/scholia/app/templates/' + filename + '">' +
                        filename.replace("_", ": ") +
                    '</a>' +
                '</span>'
            );
        }
    })
};

function sparqlToMatrix(sparql, element, filename){
    
    window.onresize = resize(element);

    sparqlToResponse(sparql, function(response) {
        var data = response.results.bindings;

        var qToLabel = new Object();
        data.forEach(function(item, index) {
            qToLabel[item.topic.value.substring(31)] = item.topicLabel.value || item.topic.value.substring(31);
            qToLabel[item.work.value.substring(31)] = item.workLabel.value || item.work.value.substring(31);
        });
   
        var works = $.map(data, function(row) {
            return row.work.value.substring(31);
        });
        var topics = $.map(data, function(row) {
            return row.topic.value.substring(31);
        });
   
        // Sizes
        var margin = { top: 100, right: 0, bottom: 0, left: 0 },
            width = $(element)[0].clientWidth
            axis_height = works.length * 12,
            full_height = axis_height + margin.top;
   
        var svg = d3
            .select(element)
            .append("svg")
            .attr("width", width)
            .attr("height", full_height)
            .append("g")
            .attr("transform", "translate(0, " + margin.top + ")");
   
        // X scales and axis
        var xScale = d3
            .scaleBand()
            .range([0, width])
            .domain(topics);
        svg
            .append("g")
            .call(
            d3
                .axisTop(xScale)
                .tickSize(0)
                .tickFormat(function(d) {
                return qToLabel[d];
                })
            )
            .selectAll("text")
            .style("text-anchor", "start")
            .attr("transform", "rotate(-65)");
   
        // Y scales and axis
        var yScale = d3
            .scaleBand()
            .range([0, axis_height])
            .domain(works)
   
        svg
            .append("g")
            .style("font-size", "16px")
            .style("text-anchor", "start")
            .style("opacity", 0.3)
            .call(
            d3
                .axisLeft(yScale)
                .tickSize(0)
                .tickFormat(function(d) {
                return qToLabel[d];
                })
            )
   
        // Move y-label slight to the right so the first lette is not cut
            .selectAll("text")
            .attr("x", 1)
   
        svg.selectAll("g .domain").remove()
   
        // Tooltip
        var tooltip = d3
            .select("body")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("padding", "10px")
            .style("font-size", "16px");
   
        var mouseover = function(d) {
            html =
            "<a href='../work/" +
            d.work.value.substring(31) +
            "'>" +
            d.workLabel.value +
            "</a>" +
            "<br/>" +
            "<a href='../topic/" +
            d.topic.value.substring(31) +
            "'>" +
            d.topicLabel.value +
            "</a>";
   
            tooltip
            .html(html)
            .transition()
            .delay(0)
            .style("opacity", 1)
            .style("left", d3.event.pageX + "px")
            .style("top", d3.event.pageY + "px")
            .style("position", "absolute");
        };
        var inMouseOut = false;
        var mouseout = function(d) {
            tooltip
            .transition()
            .delay(2000)
            .duration(2000)
            .style("opacity", 0);
        };
   
        // Add elements in matrix
        svg
            .selectAll()
            .data(data, function(d) {
            return true;
            })
            .enter()
            .append("rect")
            .attr("x", function(d) {
            var xIndex = d.topic.value.substring(31);
            var xValue = xScale(xIndex);
            return xValue;
            })
            .attr("y", function(d) {
            var yValue = yScale(d.work.value.substring(31));
            return yValue;
            })
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .style("opacity", 0.5)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);
        });

        $(element).after(
            '<span style="float:right; font-size:smaller"><a href="https://github.com/fnielsen/scholia/blob/master/scholia/app/templates/' + filename + '">' +
            filename.replace("_", ": ") +
            '</a></span>');

}

function sparqlToPathWayPageViewer(sparql, filename){

    $(document).ready(function() {
        // Hide optional sections until data values are confirmed and ready
        var organismSection = document.getElementById("Organism")                                                                                         
        organismSection.style.display = "none"; 
      
        var pathwayViewerSection = document.getElementById("pathway-viewer")                                                                                
        pathwayViewerSection.style.display = "none"; 
      
        // Check for optional data values and then use them if available
        const sparqlURL = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql?query=' + 
          encodeURIComponent(sparql) + '&format=json';
        $.getJSON(sparqlURL, function(response) {
          const simpleData = sparqlDataToSimpleData(response);
          const dataValues = simpleData.data[0];
          if ("pathwayDescription" in dataValues) {
            $("#description").text(dataValues.pathwayDescription);
          }
          if ("organism" in dataValues) {
            organismScholia = dataValues.organism.replace("http://www.wikidata.org/entity/","https://scholia.toolforge.org/taxon/")
            $("#Organism").after('<a href="' + organismScholia + '">' +
                     escapeHTML(dataValues.organismLabel) +
                     '</a>'); 
            organismSection.style.display = "";
          }
          if ("wpid" in dataValues) {
            const pathwayViewerIFrameResults = $.find("#pathway-viewer > iframe");
            pathwayViewerIFrameResults.every(function(pathwayViewerIFrameResult) {
              pathwayViewerIFrameResult.setAttribute("src", `https://pathway-viewer.toolforge.org/?id=${dataValues.wpid}`);
            });
            pathwayViewerSection.style.display = "";
            $("#pathway-viewer").after(
                '<p>This diagram is showing WikiPathways <a href="https://www.wikipathways.org/instance/' + 
                dataValues.wpid + '">' + dataValues.wpid + 
                '</a> in an iframe with this <a href=' +
                '"https://pathway-viewer.toolforge.org/?id=' + 
                dataValues.wpid + 
                '">pathway-viewer running on Toolforge</a>.</p>' );
                       
          }
        });
      });

}

function sparqlToShortInchiKey(sparql, key,  element, filename) {
    
    shortkey = key.substring(0,14)
    new_sparql = sparql.replace("_shortkey_",shortkey)
    sparqlToDataTable2(new_sparql, element, filename);

}
