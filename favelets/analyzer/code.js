/// <reference path="../jquery-1.4.1.min.js" />
/// <reference path="../jquery.ref.js" />
(function () {

   
    var dataProvider = function (_window) {
        function d() {
            return _window.document;
        }
        function $$(s) {
            return $(s, d());
        }
        function ret(metrics, raw) {
            return { metrics: metrics, raw: raw };
        }
        // global collected data


        var _dataProvider = {
            url: function () {
                return ret(0, document.URL);
            },
            compatMode: function () {
                var doc = d(), cm = doc.compatMode;
                return ret(cm, { documentMode: doc.documentMode, X_UA_Compatible: null }); //TODO: detect  X-UA-Compatible META
            },
            title: function () {
                var e = $$("html>head>title");
                return ret(e.length, e.html()); //e.text() not working in MSIE 8 ?
            },
            base: function () {
                var es = d().getElementsByTagName("BASE");
                return ret(es.length, es);
            },
            cookies: function () {
                var cookie = d().cookie,
                    cs = cookie && cookie.split(";");
                return ret(cs.length, cs);
            },
            sensitiveCookies: function () {
                //JSESSIONID, ASPSESSIONID, ASP.NET_SessionId, CFID / CFTOKEN, PHPSESSID
                // find more
                var sensitives = /^JSESSIONID|ASPSESSIONID/i, // TODO: extract 
                    found = $.grep(this.cookies().raw, function (cookie) {
                        var cookieName = cookie.split("=")[0];
                        if (sensitives.test(cookieName)) return cookie; //else undef
                    });
                return ret(found.length, found);
            },
            sensitiveInfoInLinks: function () {
                var re = new RegExp("JSESSIONID=", "gi");
                uris = this.uriReferences().raw;
                s = $.map(uris, function (uri) {
                    return re.test(uri) ? uri : null;
                });
                return ret(s.length, s);
            },
            uriReferences: function () {
                var uri, uris = [], i, e;
                for (es = d().getElementsByTagName("*"), i = es.length; i; ) {
                    e = es[--i];
                    //uri = e.href || e.src;
                    uri = $.ref(e);
                    //uri = $(e).ref();
                    if (uri) uris.push(uri);
                }
                return ret(uris.length, uris);
                /* 22 seconds in MSIE
                var uris = $("*[href],*[src]", d()).map(function (i, e) {
                return e.href || e.src;
                });
                return ret(uris.length, uris);
                */
            },

            serverBanner: function () {
                // TODO: fix retvals
                // null means error, "" means no banner, other means banner found (also from HTTP err msg)
                var banners = [], tryBanners = function (xhr) {
                    if ((h = xhr.getResponseHeader("Server"))) banners.push(h);
                    if ((h = xhr.getResponseHeader("X-Powered-By"))) banners.push(h);
                };
                $.ajax({
                    async: false,
                    url: d().URL, //document.URL used instead of window.location, due to more stable encoding across browsers,
                    //cache: false,  
                    // MSIE does not see Server header for cached response, 
                    // however jQuery solution with appended query string 
                    // may break server URI for strict sites
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Cache-Control", "max-age=0, must-revalidate");
                        xhr.setRequestHeader("If-Modified-Since", "Thu, 01 Jan 1970 00:00:00 GMT");
                        return true;
                        // TODO try to remove x-requested-with, 
                        // some web sites may fail with this header in request
                    },
                    success: function (data, status, xhr) {
                        tryBanners(xhr);
                    },
                    error: function (xhr) {
                        tryBanners(xhr);
                    }
                });

                return ret(banners.length, banners);
            },
            contentType: function () {
                var ct = ""; //safer value for others
                $.ajax({
                    async: false,
                    cache: true,
                    url: d().URL,
                    beforeSend: function (xhr) {
                        //xhr.setRequestHeader("Cache-Control", "max-age=0, must-revalidate");
                        //xhr.setRequestHeader("If-Modified-Since", "Thu, 01 Jan 1970 00:00:00 GMT");
                        return true;
                        // TODO try to remove x-requested-with, 
                        // some web sites may fail with this header in request
                    },
                    success: function (data, status, xhr) {
                        ct = xhr.getResponseHeader("Content-Type");
                    }
                });

                return ret(ct, ct);
            },
            lastModified: function () {
                var lm = d().lastModified;
                //return ret(new Date().valueOf() - lm, lm);
                return ret(null, lm); // can we use this for anything in analysys ?
            },
            inlineScripts: function () {
                var scripts = $$("SCRIPT:not([src])");
                return ret(scripts.length, scripts); //how to return array not jQuery ?
            },
            externalScripts: function () {
                var uri, uris = [], i, e;
                for (es = d().getElementsByTagName("SCRIPT"), i = es.length; i; ) {
                    e = es[--i];
                    uri = $.ref(e, "src");
                    if (uri && !$.isUrlInternal(uri)) {
                        uris.push(uri);
                    }
                }
                return ret(uris.length, uris);
            },
            comments: function () {
                var comments = [],
                traverse = function (node) {
                    node = node.firstChild;
                    while (node) {
                        if (node.nodeType == 8) {
                            comments.push(node);
                        }
                        else if (node.hasChildNodes) {
                            traverse(node);
                        }
                        node = node.nextSibling;
                    }
                }
                traverse(d());
                // MSIE treating doctype as comment ?
                // //TODO: regexp, bevare whitespace ? , Entity (6)? 
                if (comments[0] && comments[0].nodeValue.indexOf("DOCTYPE ") == 0) {
                    comments.shift();
                }
                return ret(comments.length, $.map(comments, function (e) { return e.nodeValue; }));
            },
            // TODO: goal with doctype: check if HTML, XHTML, XHTML over text/html (Warn) or HTML 5.0
            // check if strict or quircks mode
            doctype: function () {
                // TODO: finish !
                //var dt = document.doctype && doctypeToString(document.doctype) || (function (node) {
                // FF returns document.doctype as HTML (based on content/type) even if document contains XHTML, so I use detection from document
                // not from model
                var dt = (function (node) {
                    node = node.firstChild;
                    while (node) {
                        if (node.nodeType == 10) {
                            return doctypeToString(node);
                        }
                        else if (node.nodeType == 8 && node.nodeValue.indexOf("DOCTYPE ") == 0)
                            return "<!" + node.nodeValue + ">";
                    }
                })(d());
                // is HTML 5 from code in https://addons.opera.com/addons/extensions/download/html5-powered/1.0/
                // doctype && doctype.name.toLowerCase() === 'html' && !doctype.systemId && !doctype.publicId
                // see this for grammar http: //railroad.my28msec.com/precomputed/xml.xhtml#doctypedecl
                return ret(!!dt, dt);
            },
            inlineStyles: function () {
                //TODO: fails in MSIE 7.0 (study jQuery) 
                var s = $$("*[style]");
                if (!$.support.style) { ///MSIE 7.0 lame workaround
                    s = $.grep(s, function (e) {
                        return $(e).attr("style");
                    });
                }
                return ret(s.length, s);
            },
            frames: function () {
                var s = $$("iframe frame");
                return ret(s.length, s);
            },
            //H37: Using alt attributes on img elements
            // naive , there are other techniques of course
            "H37: Using alt attributes on img elements": function () {
                var s = $$("img:not([alt])");
                return ret(s.length, s);
            },
            forms: function () {
                var s = d().getElementsByTagName("FORM");
                return ret(s.length, s);
            },
            hiddenFields: function () {
                var ss = $$("input[type=hidden]");
                return ret(ss.length, ss);
            }


        };
        return _dataProvider;
    };
    var dataAnalyzer = function (dataProvider) {

        function ret(d, status, msgs) {
            return $.extend(d, { status: status || "OK", msgs: msgs || [] });
        };
        function standardRet(d, msg, keepRaw) {
            var r, m = d.metrics, msgs = [m + " " + msg + " found"];
            if (m > 0) {
                r = ret(d, "Warn", msgs);
                //,add other descriptive messages
            }
            else {
                r = ret(d, "OK", msgs);
            }
            if (!keepRaw) d.raw = null; //TODO: nicer , somewhere else not in analyzer?
            return r;
        };
        var _dataAnalyzer = {
            compatMode: function (d) {
                var cm = d.metrics, dm = d.raw.documentMode, ua = d.raw.X_UA_Compatible;
                d.status = (d.metrics == "CSS1Compat" ? "OK" : "Err");
                d.msgs = ["Document running in " + d.metrics + " mode"];
                if (dm) d.msgs.push("documentMode " + dm + " detected"); //TODO: compare to MSIE version if less warn
                delete d.raw;
                return d;
            },
            title: function (d) {
                return (d,
                    d.metrics == 1
                        ? ($.trim(d.raw) ? ret(d) : ret(d, "Err", ["Empty TITLE tag ?"]))
                        : ret(d, "Err",
                    [(d.metrics == 0 ? "Zero" : "Multiple") + " TITLE tags ?"])
                );
            },
            contentType: function (d) {
                return d;
            },
            doctype: function (d) {
                var dt = docType(d.raw),
                ct = dataProvider.contentType().raw.toLowerCase(),
                msgs = d.msgs = [];
                d.status = "OK";

                if (dt.is("XHTML")) {
                    msgs.push("XHTML");
                    if (ct != "application/xhtml+xml") { //TODO: 1.0 vs 1.1 CT ?
                        msgs.push("Inconsitent DOCTYPE and ContentType");
                        d.status = "Warn";
                    }
                }
                else if (dt.is("HTML")) {
                    msgs.push("HTML");
                }
                //d.raw = null;
                return d;
            },
            cookies: function (d) {
                return standardRet(d, "script accessible cookies", true);
            },
            sensitiveCookies: function (d) {

                var r, m = d.metrics,
                msg = " sensitive script accessible cookies",
                msgs = [m + " " + msg + " found"],
                sensitives = {
                    JSESSIONID: "JSESSIONID: Standard JEE Session cookie, TODO: explaing why it is bad to be accessible by script ;-)",
                    // how to make this work ?
                    ASPSSIONID: "<a href='http://msdn.microsoft.com/en-us/library/ms972338.aspx'>ASPSSIONID</a>"
                };
                if (m > 0) {
                    r = ret(d, "Err", msgs);
                    $.each(d.raw, function (i, cookieString) {
                        var cookieName = cookieString.split("=")[0],
                            msg = sensitives[cookieName];
                        if (msg) msgs.push(msg);
                    });
                }
                else {
                    r = ret(d, "OK", msgs);
                }
                //d.raw = null; //TODO: nicer ?
                return r;

            },
            sensitiveInfoInLinks: function (d) {
                var r = standardRet(d, ' " links containg sensitive information"', true);
                if (r.metrics > 0) r.status = "Err";
                return r;

            },
            serverBanner: function (d) {
                function isKnown() {
                    return true; //TODO:
                }
                function isOutOfDate() {
                    return false; //TODO:
                }
                return standardRet(d, ' "banner headers"', true);
            },
            uriReferences: function (d) {
                var r = standardRet(d, "uris (.src, .href)", true),
                externals = [], internals = [], fragments = [], oths = [];

                $.each(r.raw, function (i, uri) {

                    if ($.isUrlExternal(uri)) externals.push(uri);
                    else if ($.isUrlInternal(uri)) internals.push(uri);
                    else if ($.isUrlFragment(uri)) fragments.push(uri);
                    else oths.push(uri);
                });
                var ms = (r.msgs = r.msgs || []);
                ms = ms.concat([
                    externals.length + " external URIs found",
                    internals.length + " internal URIs found",
                    fragments.length + " fragment URIs found"
                ]);
                ms = ms.concat($.map(oths, function (uri) { //TODO: nicer jQuery syntax ?
                    return "Other:" + enc(uri);
                }));
                r.msgs = ms;
                delete d.raw;
                r.status = "OK";
                return r;
            },
            comments: function (d) {
                var c = 0, r = standardRet(d, "comments", true),
                re = /^\u005bif([\s\S])*\u003c\u0021\u005b\u0065\u006e\u0064\u0069\u0066\u005d$/i;
                $.each(d.raw, function (i, comment) {
                    // TODO: full grammar ?!
                    // [if lt IE 7]>anything including newlines<![endif]
                    if (re.test(comment)) {
                        c++;
                    }
                });
                //delete d.raw;
                if (c)
                    r.msgs.push(c + " MSIE Conditional Comment(s) Found");
                return r;
            },
            externalScripts: function (d) {
                return standardRet(d, "externalScripts", true);
                //TODO: add Err if !ell known
            },
            inlineScripts: function (d) {
                return standardRet(d, "inlineScripts");
            },
            inlineStyles: function (d) {

                var r = standardRet(d, "inlineStyles", true);
                r.raw = $.map(d.raw, function (e) {
                    return $(e).attr("style") || null;
                });
                return r;

            },
            frames: function (d) {
                // TODO: interpret according to doctype please 
                return standardRet(d, "frames");
            },
            "H37: Using alt attributes on img elements": function (d) {
                return standardRet(d, "images without alt");
            },
            forms: function (d) {
                var r = standardRet(d, "forms", true),
                actions = $.map(r.raw, function (form) {
                    //alert(form.action);
                    return $.ref(form, "action"); //TODO: how to resolve to absolute URI ? (again sometimes does not work in MSIE, getAttribute(4) does not help) !
                }),
                uris = categorizeUris(actions);
                r.msgs = (r.msgs || []).concat([
                    uris.externals.length + " external actions found",
                    uris.internals.length + " internal actions found",
                    uris.fragments.length + " fragment actions found",
                    uris.others.length + " other actions found"
                ]);
                r.status = uris.externals.length > 0 ? "Warn" : "OK";
                //TODO: analyze external forms !
                r.raw = actions;
                return r;
            },
            hiddenFields: function (d) {
                var r = standardRet(d, "hidden fields", true);
                d.raw = $.map(d.raw, function (input) {
                    return input.name || input.id;
                });
                d.status = "OK"; //TODO: design check
                return r;
            }
        };
        return _dataAnalyzer;
    };
    function measuringProxy(o) {
        var p, f, proxy = {};
        for (p in o) {
            if ($.isFunction(f = o[p])) {
                proxy[p] = function (f, o) {
                    return function () {
                        var d1 = new Date(),
                        r = f.apply(o, arguments);
                        r.dbg = (r.dbg || "") + new Date().valueOf() - d1 + " ms"; //formating inside measuree ? move !
                        return r;
                    }
                } (f, o);
            }
        }

        return proxy;
    };
    function log(msg) {
        document.body.innerHTML += msg + "<BR/>";
        return log; //'chaining' ;-)
    };
    function categorizeUris(uris) {
        var externals = [], internals = [], fragments = [], others = [];
        $.each(uris, function (i, uri) {

            if ($.isUrlExternal(uri)) externals.push(uri);
            else if ($.isUrlInternal(uri)) internals.push(uri);
            else if ($.isUrlFragment(uri)) fragments.push(uri);
            else others.push(uri);
        });
        return {
            externals: externals,
            internals: internals,
            fragments: fragments,
            others: others
        };
    }
    var enc = (function () {
        // performance is 78ms on MSIE 7 (the slowest one)
        // on 80KB html markup from: http://www.w3.org/TR/html4/
        var re = new RegExp(
        // surrogate pair (sp)
            "([\uD800-\uDBFF][\uDC00-\uDFFF])" +
        // html UNUSED including standalone surogates (un)
            "|([\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uD800-\uDFFF])" +
        // out of ascii (oa)
            "|([^\u0000-\u007F])" +
        // big 5 + add others (b5)
            "|([\u0022\u0026\u0027\u003C\u003E])", "g"),
         toCodePoint = function (high, low) {
             return ((high - 0xD800) << 10) + (low - 0xDC00) + 0x010000;
         },
         enc = function (m, sp, un, oa, b5) {
             // extracted out from main function and ifs changed to ternary
             // thanx to Andrea Giammarchi
             return "&#" + (oa || b5 ? m.charCodeAt(0) : (un ? "xFFFD" : toCodePoint(m.charCodeAt(0), m.charCodeAt(1)))) + ";";
         };
        return function (s) {
            return s.replace(re, enc);
        }
    } ());
    var docType = function (docTypeString) {
        var that = {
            is: function (what) {
                // naive !
                return new RegExp(what, "i").test(docTypeString);
            }
        };
        return that;
    };
    var doctypeToString = function (dt) {
        //https://developer.mozilla.org/En/DOM/DocumentType
        return "<!DOCTYPE " + dt.name +
            (dt.publicId ? " PUBLIC \"" + dt.publicId : "\"") +
            (dt.systemId ? " \"" + dt.systemId + "\"" : "") +
        ">";
    };
    jQuery().ready(function () {

        function renderDT(o) {
            var html = "<DT id='" + o.label /*TODO:sanitoze*/
            + "'>" + enc(o.label || "") + "</DT>";
            $.each(["status", "msgs", "raw", "dbg", "metrics"], function (i, k) { /*  */
                if (o[k] != null) html += "<DD class='" + k + (k == "status" ? " " + o[k] : "") + "'>"
                + ($.isArray(o[k]) && o[k].length
                    ? "<UL>" + $.map(o[k], function (v) {
                        return "<LI>" + (k == "msgs" ? v : enc(v)) + "</LI>";
                    }).join("") + "</UL>"
                    : enc("" + o[k]))
                + "</DD>";
            });
            return html;
        }

        function go(dataProvider, dataAnalyzer, methodNameList, sectionTitle) {
            var html = "<H2>" + enc(sectionTitle) + "</H2><DL>";

            $.each(methodNameList, function (i, methodName) {
                var fn = dataProvider[methodName],
                // get data
                d1 = fn.call(dataProvider);
                // extend with label (in case analyzer does not exists
                // it has default name
                d1.label = methodName;
                // if analyzerm, than call (analyzer modifies d)
                if ((fn = dataAnalyzer[methodName]))
                    d1 = fn.call(dataAnalyzer, d1);
                // render one DT item
                html += renderDT(d1);
            });
            html += "</DL>";
            return html;
        };

        $(".progress").html("Running analysis...please wait");
        var dp = measuringProxy(dataProvider(window.opener)),
        da = dataAnalyzer(dp), html = "<h1>Page Analyzer</h1><address>designed by a.in.the.k</address>";
        //html += "<DIV id='quirck1'>";

        //delete dp.inlineStyles; //too slow
        delete dp.base; //useless without analysis 

        html += go(dp, da,
            "url,compatMode,doctype,contentType,lastModified".split(","),
            "General");
        html += go(dp, da,
            "cookies,sensitiveCookies,sensitiveInfoInLinks,externalScripts".split(","),
            "Security");
        html += go(dp, da, [
            "forms", "hiddenFields"
            ],
            "Forms");
        html += go(dp, da, [
            "title",
            "H37: Using alt attributes on img elements"],
            "Semantics");
        html += go(dp, da, [
            "inlineScripts", "inlineStyles", "frames", "comments"],
            "Misc");
        //html += "</DIV>";

        function draw1() {
            $(".progress").fadeOut("normal", function () {
                $(html)
                .appendTo(document.body)
                .filter("#quirck1")
                    .accordion({
                        fillSpace: true,
                        header: 'H2'
                    }).fadeIn('normal');
            });
        }
        function draw2() {
            $(".progress").fadeOut("normal", function () {
                $(html)
                .appendTo(document.body);
            });
        }
        function generateToc() {
            $("DL").text()
        }
        draw2();
    });

} ());

//  TODO: 
//  check standard vs quircks mode
//  check missing/inconsistent metas 
//  check too deep nesting
//  check empty ULs, DIVs etc...
//  DONE: count link statisticks (inisde, outside)
//  check accesibility rules (img, title etc..)
//  DONE: jSession string in URLs
//  DONE: cookies
//  DONE: presence of JSESSIONID=E281E26BADF568C3D0F53D17989191F9 is security warning
//  other auth. or session wel known cookie names
//  Out Of Control: integration section (all scripts and resources, that point outside of existing domain (2level, 3level check))
//  well known hidden field names
// H1, H2 structures correct nesting
// object and applet tags
// using absolute URIs for your own site (how much is the overhead ?) 
// checking URI encoding 
// <style type="text/css">@import detect @imports

// refactoring ??? inherited objects ?
//  cnstr(window)
//  collectData->{metric:,data:}
//  analyze({metric:,data:})->{metric,data,status,msgs}
//  display({metric,data,status,msgs})->HTML string
//  run() -> HTML
// or 3 classes DataCollector, Analyzer, Display ?


//so what is really cool ?
