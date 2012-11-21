
var openmdao = (typeof openmdao === "undefined" || !openmdao ) ? {} : openmdao ;

openmdao.ParametersPane = function(elm,model,pathname,name,editable) {
    var parms,
        candidates = [],
        limits = {},
        parmsDiv = jQuery("<div id='"+name+"_parms' class='slickgrid' style='overflow:none; height:320px; width:620px'>"),
        addButton = jQuery("<button>Add Parameter</button>").button(),
        clrButton = jQuery("<button>Clear Parameters</button>").button(),
        columns = [
            {id:"del",     name:"",        field:"del",     width:25, formatter:buttonFormatter},
            {id:"target",  name:"Target",  field:"target",  width:140},
            {id:"low",     name:"Low",     field:"low",     width:70},
            {id:"high",    name:"High",    field:"high",    width:70},
            {id:"scaler",  name:"Scaler",  field:"scaler",  width:60},
            {id:"adder",   name:"Adder",   field:"adder",   width:50},
            {id:"fd_step", name:"fd_step", field:"fd_step", width:60},
            {id:"name",    name:"Name",    field:"name",    width:50}
        ],
        options = {
            asyncEditorLoading: false,
            multiSelect: false,
            autoHeight: false,
            autoEdit: false
        };

    function buttonFormatter(row,cell,value,columnDef,dataContext) {  
        button = '<div class="ui-icon-trash"></div>';
        return button;
    }
    elm.append(parmsDiv);

    var tabdiv = jQuery('<div class="post_slick" style="height:40px;">'),
        table = jQuery('<table width="100%">'),
        row = jQuery('<tr>').append(jQuery('<td style="text-align:left">').append(addButton))
                            .append(jQuery('<td style="text-align:right">').append(clrButton));
    table.append(row);
    tabdiv.append(table);
    elm.append(tabdiv);

    if (editable) {
        options.editable = true;
        options.editOnDoubleClick = true;
    }

    parms = new Slick.Grid(parmsDiv, [], columns, options);
    if (editable) {
        parms.onCellChange.subscribe(function(e,args) {
            // TODO: better way to do this (e.g. model.setProperty(path,name,value)
            // TODO: check type and behave appropriately (quotes around strings?)
            cmd = pathname+'.'+args.item.name+'='+args.item.value;
            model.issueCommand(cmd);
        });
   }
    parms.onClick.subscribe(function (e) {
        var cell = parms.getCellFromEvent(e);
        if (cell.cell==0) {
            var delname = parms.getData()[cell.row].name
            if (delname.split(",").length>1) {
                cmd = pathname+'.remove_parameter('+delname+');';
            }
            else {
                cmd = pathname+'.remove_parameter("'+delname+'");';
            }
            model.issueCommand(cmd);
        }
    });   
    
    parmsDiv.bind('resizeCanvas', function() {
        parms.resizeCanvas();
    });


    /** add a new parameter */
    function addParameter(target,low,high,scaler,adder,name) {
    
        // Supports parameter groups
        var targets = target.split(",");
        if (targets.length>1) {
            cmd = pathname+".add_parameter((";
            for(var i = 0; i < targets.length; i++) {
                cmd = cmd + "'" + jQuery.trim(targets[i]) + "',";
            }
            cmd = cmd + ")";
        }
        else {
            cmd = pathname+".add_parameter('"+target+"'";
        }
        
        if (low) {
            cmd = cmd + ",low="+low;
        }
        if (high) {
            cmd = cmd + ",high="+high;
        }
        if (scaler) {
            cmd = cmd + ",scaler="+scaler;
        }
        if (adder) {
            cmd = cmd + ",adder="+adder;
        }
        if (name) {
            cmd = cmd + ",name='"+name+"'";
        }
        cmd = cmd + ");";
        console.log(cmd)
        model.issueCommand(cmd);
    }

    function error_handler(jqXHR, textStatus, errorThrown) {
        debug.error("Error while trying to find candidate parameters.", jqXHR);
    }
    
    /** Breakout dialog for adding a new parameter */
    function promptForParameter(callback, model) {
    
        // Figure out all of our candidates for parameter addition.
        model.getWorkflow(pathname, function findComps(wjson) {
        
            var candidates = [];
            var limits = {};
            
            // Loop through components in workflow to gather all our param candidates
            jQuery.each(wjson[0].workflow, function(idx, comp) {
            
                var comppath = comp.pathname.split('.').slice(-1)[0];
                
                // Loop through inputs in component and fill our table of candidates
                model.getComponent(comp.pathname, function findInputs(cjson) {
                    var high, low;
                    jQuery.each(cjson.Inputs, function(idx, input) {
                        low = null;
                        high = null;
                        if (input.low) {
                            low = input.low;
                        };
                        if (input.high) {
                            high = input.high;
                        };
                        fullpath = comppath + '.' + input.name
                        candidates.push(fullpath);
                        limits[fullpath] = [low, high];
                        console.log("inner ", candidates);
                    });
                });     
            });
    
            console.log(candidates)
            
            // Build dialog markup
            var win = jQuery('<div id="parameter-dialog"></div>'),
                target = jQuery('<input id="parameter-target" type="text" style="width:100%"></input>'),
                low    = jQuery('<input id="parameter-low" type="text" style="width:50%"></input>'),
                high   = jQuery('<input id="parameter-high" type="text" style="width:50%"></input>'),
                scaler = jQuery('<input id="parameter-scaler" type="text" style="width:50%"></input>'),
                adder  = jQuery('<input id="parameter-adder" type="text" style="width:50%"></input>'),
                name   = jQuery('<input id="parameter-name" type="text" style="width:50%"></input>');
    
            win.append(jQuery('<div>Target: </div>').append(target));
            parm_selector = win.find('#parameter-target');
    
            var table = jQuery('<table>');
            row = jQuery('<tr>').append(jQuery('<td>').append(jQuery('<div>Low: </div>').append(low)))
                                .append(jQuery('<td>').append(jQuery('<div>High: </div>').append(high)));
            table.append(row);
            row = jQuery('<tr>').append(jQuery('<td>').append(jQuery('<div>Scaler: </div>').append(scaler)))
                                .append(jQuery('<td>').append(jQuery('<div>Adder: </div>').append(adder)));
            table.append(row);
            row = jQuery('<tr>').append(jQuery('<td>').append(jQuery('<div>Name: </div>').append(name)));
            table.append(row);
            win.append(table);
    
            // update the parameter selector.
            parm_selector.html('');
            parm_selector.autocomplete({ source: candidates, minLength:0});
    
            function setupSelector(selector) {
        
                // process new selector value when selector loses focus
                selector.bind('blur', function(e) {
                    selector.autocomplete('close');
                });
        
                // set autocomplete to trigger blur (remove focus)
                selector.autocomplete({
                    select: function(event, ui) {
                        selector.val(ui.item.value);
                        selector.blur();
                    },
                    delay: 0,
                    minLength: 0
                });
        
                // set enter key to trigger blur (remove focus)
                selector.bind('keypress.enterkey', function(e) {
                    if (e.which === 13) {
                        selector.blur();
                    }
                });
            }
        
            setupSelector(parm_selector);
    
            // Display dialog
            jQuery(win).dialog({
                modal: true,
                title: 'New Parameter',
                buttons: [
                    {
                        text: 'Ok',
                        id: 'parameter-ok',
                        click: function() {
                            jQuery(this).dialog('close');
                            callback(target.val(),low.val(),high.val(),
                                     scaler.val(),adder.val(),name.val());
                            // remove from DOM
                            win.remove();
                        }
                    },
                    {
                        text: 'Cancel',
                        id: 'parameter-cancel',
                        click: function() {
                            jQuery(this).dialog('close');
                            // remove from DOM
                            win.remove();
                        }
                    }
                ]
            });
        }, error_handler);

    }

    /** clear all parameters */
    function clearParameters() {
        cmd = pathname+".clear_parameters();";
        model.issueCommand(cmd);
    }

    addButton.click(function() { promptForParameter(addParameter, model); });
    clrButton.click(function() { clearParameters(); });
    

    /** load the table with the given properties */
    this.loadData = function(properties) {
        if (properties) {
            parms.setData(properties);
        }
        else {
            parms.setData([]);
            alert('Error getting properties for '+pathname+' ('+name+')');
            debug.info(properties);
        }
        parms.resizeCanvas();
        
    };
};
