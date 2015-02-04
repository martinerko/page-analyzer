(function () {
    // opens new window with basic html-head-body structure
    // injects jquery, + favlet specific codes
    // this is naive and expects conventional .src of install
    var scripts = document.getElementsByTagName('head')[0].getElementsByTagName("script"),
    scriptSrc = scripts[scripts.length - 1].src,
    base = scriptSrc.split("/").slice(0, -1).join("/"),
    // all is needed since this window has no location itself    
    w = window.open('about:blank', '', 'width=360,height=480,resizable=1,scrollbars=yes');
    if (w != null) {
        // BUG: onload may still fail in MSIE (use refresh as workaround) 
        // FIX: I gave up and implemented wait, it seems to freeze also ;-(
        // TODO: study more
        var markup =
            '<!DOCTYPE HTML>\
				<html><head><title>Page Analyzer version 6.12.18</title> \
                <link href="' + base + '/code2.css" rel="stylesheet"/>\
                </head><body>\
                <div class="progress">Loading scripts... please wait</div>\
                <script src="' + base + '/../LAB.src.js">\x3C/script>\
                <script>(function() {\
                    function ready(){\
                        $LAB.setGlobalDefaults({ UsePreloading: false });\
                        $LAB\
                        .script("' + base + "/../jquery-1.5.js" + '").wait()\
                        .script("' + base + "/../jquery.ref.js" + '")\
                        .script("' + base + "/../jquery.ba-urlinternal.js" + '")\
                        .script("' + base + "/../modernizr.beta.js" + '").wait()\
                        .script("' + base + "/code2.js" + '");\
                    };\
                    function wait(){\
                        if(!window["$LAB"]){setTimeout(wait,100);}\
                        else ready();\
                    };\
                    wait();\
                } ());\x3C/script>\
                </body></html>';
        d = w.document;
        d.write(markup);
        d.close();
    }
    else {
        alert("Poppup blocker ?");
    }
} ());                //this document points to the "host" window