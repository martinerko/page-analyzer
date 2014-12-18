(function () {



    function str(that, params) {
        return that.replace(/\%([0-9]+)/gm, function (a, b) { return params[parseInt(b,10)]; });
    }

    var enc = (function () {
        // TODO: dry, publish enc library one day (see a.in.the.k on blogspot)
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
        };
    } ());
    function unique(arr) {
        var r = [], h = {}, p, i;
        for (i = arr.length; i; ) h[arr[--i]] = true;
        for (p in h) r.push(p);
        return r;
    }
    var detectConventions = (function (arr) {
        // by ukrop, refact marcus
        var re = RegExp(
        // neutral			(n)
	    "(^[a-z0-9]+$)|" +
        // dash				(d)
	    "(^[a-z0-9]+(?:-[a-z0-9]+)+$)|" +
        // underscore		(u)
	    "(^[a-z0-9]+(?:_[a-z0-9]+)+$)|" +
        // hungarian		(h)
	    "(^[a-z0-9]+[A-Z][a-zA-Z0-9]*$)|" +
        // other			(o)
	    "([\\s\\S]*)"
	    ),
	    not = function (m, n, d, u, h, o) {
	        return n ? "neutral" : (d ? "dash" : (u ? "underscore" : (h ? "hungarian" : "other")));
	    },
	    _detectConventions = function (arr) {
	        var i = arr.length, res, retObj = { "neutral": 0, "dash": 0, "underscore": 0, "hungarian": 0, "other": 0 };
	        for (; i; ) {
	            retObj[arr[--i].replace(re, not)]++;
	        }
	        return retObj;
	    };
        return _detectConventions;
    })();

    var isDeprecated = (function () {
        function makeHash(arr) {
            var r = {}, l;
            for (l = arr.length; l; ) r[arr[--l]] = true;
            return r;
        }
        var deprecated_HTML4 = makeHash("APPLET,BASEFONT,CENTER,DIR,FONT,ISINDEX,MENU,S,STRIKE,U".split(",")),
            deprecated_HTML5 = makeHash("ACRONYM,APPLET,BASEFONT,BIG,CENTER,DIR,FONT,FRAME,FRAMESET,ISINDEX,MARQUEE,NOFRAMES,S,STRIKE,TT,U,XMP".split(","));
        return function (tagName) {
            tagName = tagName.toUpperCase();
            return deprecated_HTML4[tagName] || deprecated_HTML5[tagName];
        };
    })();

    var docType = (function () {

        function doctypeToString(dt) {
            // does not have to match source ,systemId added in FF

            var r = "<!DOCTYPE " + dt.name
                + (dt.publicId ? " PUBLIC \"" + dt.publicId + "\"" : "")
                + (dt.systemId ? " \"" + dt.systemId + "\"" : "")
                + ">";
            return r;
        }
        /**
        return "" if no doctype detected 
        before first Element node.
        **/

        var docTypeFromDom = function (doc) {
            var node = doc.firstChild, r;
            while (node && node.nodeType != 1) {
                if (node.nodeType == 10)
                    r = doctypeToString(node);
                if (node.nodeType == 8 && (/^doctype/i).test(node.nodeValue))
                    r = "<!" + node.nodeValue + ">";
                node = node.nextSibling;
            }
            return r || "";
            //  FF returns document.doctype as HTML (correctly based on content/type) 
            //  even if document contains XHTML, so I use detection from document
            //  not from model

            // is HTML 5 from code in https://addons.opera.com/addons/extensions/download/html5-powered/1.0/
            // doctype && doctype.name.toLowerCase() === 'html' && !doctype.systemId && !doctype.publicId
            // see this for grammar http: //railroad.my28msec.com/precomputed/xml.xhtml#doctypedecl
        };
        var _docType = function (docOrString) {

            var strDocType = typeof docOrString == "string"
                ? docOrString
                : docTypeFromDom(docOrString);
            if (strDocType) {
                var w3cDtd = strDocType.match(/^\<\!DOCTYPE\s+HTML\s+PUBLIC\s+\"-\/\/W3C\/\/DTD\s+([\s\S]+?)\/\//i),
                isHTML5 = /<\!DOCTYPE\s+HTML\s*\>/i.test(strDocType);

                w3cDtd = w3cDtd && w3cDtd[1] ? w3cDtd[1] : "";

                var ret = {
                    w3cDtd: w3cDtd,

                    isHTML: isHTML5 || /^HTML/i.test(w3cDtd),
                    isHTML5: isHTML5,
                    isHTML41: /^HTML\s+4\.1/i.test(w3cDtd),

                    isXHTML: /^XHTML/i.test(w3cDtd),
                    isXHTML10: /^XHTML\s+1\.0/i.test(w3cDtd),
                    isXHTML11: /^XHTML\s+1\.1/i.test(w3cDtd),
                    isXHTML20: /^XHTML\s+2\.0/i.test(w3cDtd),

                    toString: function () { return strDocType; }
                };
            }
            else
                ret = null;
            return ret;
        };
        return _docType;
    } ());

    function dataProvider(wnd) {

        ////////////////////////////////////////////////////////////////////////////////////////////////
        var tc, traverseCacheBluePrint = {
            comments: []
            , tagCounter: 0
            , tagStatistics: {}
            , languages: []
            , imagesWithoutAlt: [] //H37: Using alt attributes on img elements
            , nestingLevels: []
        };
        function traversed(rescan) {
            if (!tc || rescan) {
                tc = $.extend({}, traverseCacheBluePrint);

                traverse(d(), tc);
                fix(tc);
                return tc;
            }
            else {
                return tc;
            }
        }
        function traverse(node, cache, level) {
            level || (level = 0);
            node = node.firstChild;
            var nodeType;
            while (node) {
                nodeType = node.nodeType;
                if (nodeType == 8) {
                    cache.comments.push(node.nodeValue);
                }
                else if (nodeType == 1) {
                    cache.nestingLevels[level] = (cache.nestingLevels[level] || 0) + 1;
                    cache.tagCounter++;
                    //tagStatistics
                    var tagName = node.tagName;
                    cache.tagStatistics[tagName] = (cache.tagStatistics[tagName] || 0) + 1;
                    //language
                    var lang = node.getAttribute("lang");
                    if (lang)
                        cache.languages.push(lang);
                    // tags pecific
                    if (tagName == "SCRIPT") {
                        if (!tagName.src) {
                        }
                    }
                    else if (tagName == "IMG") {
                        if (!node.alt) cache.imagesWithoutAlt++;
                    }
                }
                //
                if (node.hasChildNodes) {
                    traverse(node, cache, level + 1);
                }
                node = node.nextSibling;
            }
        }
        function fix(cache) {
            // MSIE incorrectly considers DOCTYPE as comment
            var comments = cache.comments;
            if (comments[0] && comments[0].indexOf("DOCTYPE ") == 0)
                comments.shift();
            //MSIE counts /LINK as tag in XHTML/HTML bad formated    
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////
        function d() { return wnd.document; }
        function isStub(src) {
            //TODO: better !
            return /stub\.js$/.test(src);
        }
        function getAttribute(that, attrName) {
            var a = that.attributes && that.attributes.getNamedItem(attrName); //TODO: vs. getAttributeNode performance test !
            return a != null ? a.nodeValue : null;
        }
        var HANDLER_NAMES = (function () {
            return ["onclick", "onload"]; //two usual until good method found

            // TODO: how to detect available on* names from elements in browser ?
            // next does not work IN FF  
            //            var e = document.body,
            //            ret = [], e, a, j,
            //            attrs = e.attributes;
            //            //alert(attrs.length);
            //            if (attrs && attrs.length) {
            //                //MSIE 8
            //                for (j = attrs.length; j; ) {
            //                    a = attrs[--j];
            //                    if (a.name.indexOf("on") == 0) {
            //                        ret.push(a.name);
            //                    }
            //                }
            //            }
            //            else {
            //                //MSIE < 8
            //                for (var p in e) {
            //                    if (p.indexOf("on") == 0) {
            //                        ret.push(p);
            //                    }
            //                }
            //            }
            //            // others ?
            //            return ret;
        })();
        function externalScripts(acceptSubdomains) {

            if (acceptSubdomains)
                $.urlInternalHost("[^/?#]*", "www");
            else
                $.urlInternalHost("www");
            var uri, uris = [], i, e, es;
            for (es = d().getElementsByTagName("SCRIPT"), i = es.length; i; ) {
                e = es[--i];
                //uri = $.ref(e, "src");
                uri = e.src;
                if (!isStub(uri)) {
                    if (uri && !$.isUrlInternal(uri)) {
                        uris.push(uri);
                    }
                }
                //TODO: same domain URIs
                //jq_urlInternalHost('www')

            }
            return uris;
        }
        //alert($.urlInternalHost('[^/]*'));
        //alert($.urlInternalHost('[^/?#]*'));
        //)?([^?#]*)(
        that = {
            _d: function () {
                // shortcut for analyzer if no specified method is needed on provider
                return d();
            },
            _t: function () {
                return t();
            },
            // global:
            documentURL: function () {
                return d().URL;
            },
            getDocType: function () {
                return docType(d()); //may return null !
            },
            getContentType: function () {
                var headers = this.getHeaders(), //and again incocistency, I;m caling my own function here
                    contentType;
                for (var i = 0; i < headers.length; i++) {
                    var m = headers[i].match(/^Content-Type\s*:\s*([\s\S]+?)\s*$/i);
                    if (m && m.length) contentType = m[1];
                }
                return contentType || "";
            },
            // security
            cookies: function () {
                return (d().cookie ? d().cookie.split(/\s*;\s*/) : []);
            },
            links: function () {
                return d().getElementsByTagName("SCRIPT");
            },
            externalHostScripts: function () {
                return externalScripts(false);

            },
            externalDomainScripts: function () {
                return externalScripts(true);
            },
            uriReferences: function () {
                //                                var doc = d(),
                //                                hrefs = $("a,link", doc).map(function (i) {
                //                                    return this.href || null;
                //                                }).toArray();
                //                                srcs = $("script", doc).map(function (i) {
                //                                    return this.src || null;
                //                                }).toArray();
                //                                actions = $("form", doc).map(function (i) {
                //                                    return this.action || null;
                //                                }).toArray();
                //                                return hrefs.concat(srcs).concat(actions);
                var doc = d(),
                map = function (tagName, propName) {
                    var ret = [], elems, i, ref;
                    for (elems = doc.getElementsByTagName(tagName), i = elems.length; i; ) {
                        if ((ref = elems[--i][propName])) ret.push(ref);
                    }
                    return ret;
                };
                return map("A", "href").concat(
                        map("LINK", "href"),
                        map("SCRIPT", "src"),
                        map("FORM", "action")
                );
            },
            // semantics
            countBodyAll: function () {
                return d().body.getElementsByTagName("*").length;
            },
            getClassNames: function () {
                var r = [];
                for (var all = d().getElementsByTagName("*"), i = all.length, e, cn; i; ) {
                    e = all[--i];

                    if ((cn = e.className)) { //TODO:vs getAttribute ?
                        r.push(cn);
                    }
                }
                return r;
            },
            getIDs: function () {
                var r = [];
                for (var all = d().getElementsByTagName("*"), i = all.length, e, cn; i; ) {
                    e = all[--i];
                    //if ((cn = e.getAttribute("id"))) {
                    if ((cn = e.id)) {
                        r.push(cn);
                    }
                }
                return r;
            },
            countDivs: function () {
                return d().body.getElementsByTagName("DIV").length;
            },
            countSpans: function () {
                return d().body.getElementsByTagName("SPAN").length;
            },
            getInlineStyles: function () {
                //TODO: fails in MSIE 7.0 (study jQuery) 
                //                var r, $s = $("*[style]", d()); //fails in MSIE < 8, returns all elements ? 
                //                r = $.map($s, function (e) { // map is for 2 reasons for MSIE not supporting style and to map elements to strings 
                //                    return ($(e).attr("style") || null); //or null
                //                });

                //                //[] of Strings
                //                return r;
                var r = [], all = d().getElementsByTagName("*"), i, s, e;
                for (i = all.length; i; ) {
                    e = all[--i];
                    s = $(e).attr("style"); //more quircks , hence jQuery
                    //s=e.getAttribute("style"); //TODO:: include/detect incorrect style strings ?
                    if (s) r.push(s);
                }
                return r;
            },
            getHeaders: function () {
                // may return something else than original page because requested by XHR 
                // but... still better than nothing
                var headers,
                url = d().URL; //document.URL used instead of window.location, due to more stable encoding across browsers,
                $.ajax({
                    async: false,
                    url: url,
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
                        headers = xhr.getAllResponseHeaders();
                    },
                    error: function (xhr) {
                        headers = xhr.getAllResponseHeaders();
                    }
                });
                headers || (headers = ""); // TODO: error handling na access denied v jQuery ?
                return headers.split(/\r?\n/);
            },
            getInlineHandlers: function () {


                var ret = [];
                for (var elems = d().getElementsByTagName("*"), i = elems.length; i; ) {
                    var e = elems[--i];
                    for (var j = HANDLER_NAMES.length; j; ) {
                        var a, name = HANDLER_NAMES[--j];
                        if ((a = getAttribute(e, name))) //TODO: check chrome an onclick handlers, chrome reports as inline dynamically added not only from markup ?
                            ret.push(a); //value returns "null" string in MSIE ?
                    }
                }
                return ret;
            },
            // new approach, using one time traversal
            getComments: function () {
                return traversed().comments;
            },
            getLanguages: function () {
                return traversed().languages;
            },
            getTagCount: function (tagName) {
                var r;
                if (!tagName) {
                    r = traversed().tagCounter;
                }
                else {
                    r = traversed().tagStatistics[tagName] || 0;
                }
                return r;
            },
            getNestingLevels: function () {
                return traversed().nestingLevels;
            },

            getTagStatistics: function () {
                return traversed().tagStatistics;
                /*
                var all = d().getElementsByTagName("*");
                var cache = { tagStatistics: {} };
                for (var i = 0; i < all.length; i++) {
                var tagName = all[i].tagName;
                cache.tagStatistics[tagName] = (cache.tagStatistics[tagName] || 0) + 1;
                }
                return cache.tagStatistics;
                */
            },
            imagesWithoutAlt: function () {
                return traversed().imagesWithoutAlt;
            },
            getInlineScripts: function () {
                var ret = [], es, e, i;
                for (es = d().getElementsByTagName("SCRIPT"), i = es.length; i; ) {
                    e = es[--i];
                    if (!e.src) ret.push(e.textContent || e.text);
                }
                return ret;
            }
        };
        return that;
    }
    function analyzer(dataProvider) {
        var _dp = dataProvider;
        var levels = ["info", "warning", "error"];

        function info(msg, extra) { return { status: "info", msg: msg, extra: extra}; }
        function msg(level, msg, extra) { return { status: levels[level] || levels[levels.length - 1], msg: msg, extra: extra} ;}
        var general = {
            "Analyzed document": function () {
                //TODO: analyze URL for extensions, query etc....
                return [msg(0, _dp.documentURL())];
            },
            "Doctype": function () {

                var dt = _dp.getDocType(), //object 
                    dtStr = dt != null ? dt.toString() : "",
                    msgs, w3c;

                if (!dt) {
                    msgs = [msg(2, "No DOCTYPE detected ?")];
                }
                else {
                    if (dt.isHTML5)
                        msgs = [msg(0, str("HTML5 DOCTYPE detected: %0", [dtStr]), [dtStr])];
                    else if (w3c = dt.w3cDtd) {
                        msgs = [msg(0, str("W3C DTD detected: %0", [w3c]), [dtStr])];
                    }
                    else {
                        msgs = [msg(1, str("Unknown DOCTYPE detected: %0", [dtStr]), [dtStr])];
                    }
                }
                // TODO: html xhtml etc...
                return msgs;
            }
            ,
            "Compatibility Mode": function () {
                var d = _dp._d(), cm = d.compatMode, dm = d.documentMode,
                msgs = [msg(cm == "CSS1Compat" ? 0 : 2, str("%0 %1 compatibility mode", [cm, cm == "CSS1Compat" ? "standard compliant" : "obsolette"]))];
                if (dm) {
                    if (dm < 9) {
                        msgs.push(msg(1, str("You are running in obsolette MSIE documentMode %0", [dm]))); //TODO: check against real browser version (is it possible ?)
                        msgs.push(msg(0, str("Obsolette MSIE documentMode %0 may cause some of the statistics to be wrong", [dm]))); //TODO: check 7
                    }
                    else if (dm) {
                        msgs.push(msg(2, str("MSIE documentMode %0", [dm]))); //TODO: check 7
                    }
                }
                // TODO: X-UA-Compatible meta ?
                return msgs;
            }
            ,
            "Content-Type": function () {

                var dt = _dp.getDocType(),
                ct = _dp.getContentType(),
                msgs = [msg(0, str("Detected Content-Type:%0", [enc(ct)]))];
                if (!ct) {
                    msgs.push(msg(1, "cannot detect content type", []));
                }
                else if (dt) { //TODO: ten null doc type neni dobry napad asi ;-(
                    // http://www.greytower.net/archive/articles/xhtmlcontent.html
                    if (dt.isXHTML10 && !/^application\/xhtml\+xml/i.test(ct)) {
                        msgs.push(msg(1, str("XHTML1.0 in HTML Compatibility Mode (%0 over %1)?", [dt.w3cDtd, ct])));
                    }
                    else if (dt.isXHTML11) {
                        if (!/^application\/xhtml\+xml/i.test(ct)) {
                            msgs.push(
                                msg(
                                    /^application\/xml/i.test(ct) ? 1 : 2, //warn of MAY, ERR on other
                                    str("XHTML1.1 over non-standard media (%0 over %1)?", [dt.w3cDtd, ct])
                                ));
                        }
                    }
                    else if (dt.isXHTML20 && !/^application\/xhtml\+xml/i.test(ct)) {
                        msgs.push(msg(2, str("XHTML20 over non-standard media (%0 over %1)?", [dt.w3cDtd, ct])));
                    }
                    else if (dt.isHTML && !/^text\/html/i.test(ct)) { //TODO: verify HTML5 cts
                        msgs.push(msg(2, str("HTML over non-standard media (%0 over %1)?", [dt.w3cDtd, ct])));
                    }
                }
                return msgs;
            },
            "Content Length": function () {
                var headers = _dp.getHeaders(), //and again incocistency, I;m caling my own function here
                    contentLength;
                for (var i = 0; i < headers.length; i++) {
                    var m = headers[i].match(/^Content-Length\s*:\s*([\s\S]+?)\s*$/i);
                    if (m && m.length) contentLength = m[1];
                }
                var cl, src;
                if (contentLength) {
                    cl = contentLength;
                    src = "HTTP headers";
                }
                else {
                    cl = _dp._d().body.innerHTML.length;
                    src = "serialized DOM ";
                }
                return [msg(cl < 50 * 1024 ? 0 : cl < 100 * 1024 ? 1 : 2, str("Size calculated from %1 is: %0", [cl, src]))];
            }
        };
        var security = {
            "Script Accessible Cookies": function () {
                var what = _dp.cookies(), l = what.length;
                return [
                    msg(!l ? 0 : 1, str("%0 Script accessible cookies found, some of them may contain sensitive information\
                    and maybe missused by malcode like this one.", [l]), what)
                ];
            },
            "Sensitive Script Accessible Cookies": function () {
                // //JSESSIONID, ASPSESSIONID, ASP.NET_SessionId, CFID / CFTOKEN, PHPSESSID //TODO: others
                var keywords = /^JSESSIONID|ASPSESSIONID|PHPSESSID|LtpaToken/i,
                cookies = $.grep(_dp.cookies(), function (cookie) {
                    var cookieName = cookie.split("=")[0];
                    if (keywords.test(cookieName)) return cookie; //else undef
                }),
                l = cookies.length;
                return [
                    msg(!l ? 0 : 2, str("%0 Sensitive Script Accessible Cookies", [l]), cookies)
                ];
            },
            "External Scripts": function () {
                var what = _dp.externalHostScripts(); //still not tested for ports
                var msgs = [msg(what.length ? 1 : 0, str("%0 Scripts Pointing outside of your host has been found"
                    , [what.length]), what)
                ];
                if (what.length) {
                    var exts = _dp.externalDomainScripts();
                    if (exts.length)
                        msgs.push(msg(2, str("And %0 of those scripts point even outside your domain.\
                            Do you really trust them all ? They have full power over your page content !", [exts.length]), exts)
                        );
                }
                return msgs;
            },
            "Sensitive information in links": function () {
                var refs = _dp.uriReferences(),
                re = new RegExp("JSESSIONID=", "gi"),
                sensitives = [];
                for (var i = refs.length; i; ) {
                    ref = refs[--i];
                    if (re.test(ref)) sensitives.push(ref);
                }
                //                sensitives = $.map(refs, function (ref) {
                //                    return re.test(ref) ? ref : null;
                //                });
                return [
                    msg(sensitives.length ? 2 : 0, str("%0/%1 link(s) contain sensitive information", [sensitives.length, refs.length]), sensitives)
                ];
            },
            "Server Banners": function () {
                // and yes maybe I'm mixing data with analyzises here //TODO: move to _dp ?
                var headers = _dp.getHeaders(),
                banners = $.grep(headers, function (header) {
                    return (/^X-Powered-By|Server/gi.test(header));
                });
				var msgs;
                if (banners.length) {
                    msgs = [msg(2, "Server Banner Found", banners)];
                }
                else {
                    msgs = [msg(0, "No Server Banner Found", headers)];
                }
                return msgs;
            },
			"Client Banners" : function(){
				var banners=[],metas=_dp._d().getElementsByTagName("META");
				for(var i=0, l=metas.length;i<l;i++)
				{
					if(metas[i].name==="Generator")
					{	
						banners.push(str("META %1 %0",[metas[i].content, metas[i].name]));
					}
				}
				return banners.length ?	[msg(1, "Client Banners Found", banners)] : [msg(0, "No Client Banner Found")];
			}
        };
        var markup = {
            "Tag Statistics": function () {
                var msgs = [], arr = [], tn,
                    what = _dp.getTagStatistics(),
                    tagCount = _dp.getTagCount();
                for (tn in what) {
                    arr.push({ tagName: tn, count: what[tn] });
                }
                arr.sort(function (a, b) { return a.count - b.count; });
                msgs.push(msg(0, str("%0 total tags found", [tagCount])));
                for (var i = 0; i < arr.length; i++) {
                    var tagName = arr[i].tagName;
                    msgs.push(
                        msg(0, str("%0:%1", [arr[i].tagName, arr[i].count]))
                    );
                    if (tagName.charAt(0) == '/') {
                        msgs.push(
                            msg(2, str("%0: probably incompatible XHTML over text/html", [tagName]))
                        );
                    }
                    if (isDeprecated(tagName)) {
                        msgs.push(
                            msg(2, str("deprecated tag %0", [tagName]))
                        );
                    }
                }
                return msgs;
            },
            "Nesting Levels": function () {
                var msgs = [],
                    nestingLevels = _dp.getNestingLevels(),
                    deepestNest = nestingLevels.length - 1;
                for (var i = 0; i < nestingLevels.length; i++) nestingLevels[i] = i + ":" + nestingLevels[i];

                msgs.push(msg(deepestNest < 10 ? 0 : deepestNest < 15 ? 1 : 2, str("Deepest Nesting Level %0", [deepestNest]), nestingLevels));
                return msgs;


            },

            "Comments": function () {
                var what = _dp.getComments(),
                    contentLength = 0,
                    re = /^\u005bif([\s\S])*\u003c\u0021\u005b\u0065\u006e\u0064\u0069\u0066\u005d$/i,
                    conditionalCount = 0;

                for (var i = 0; i < what.length; i++) {
                    // conditional
                    if (re.test(what[i])) {
                        conditionalCount++;
                    }
                    // others
                    else {
                        contentLength += what[i].length;
                    }
                    //TODO: dubious
                }
                var unCondCount = what.length - conditionalCount;
                var msgs = [
                    msg(unCondCount == 0 ? 0 : contentLength < 1000 ? 1 : 2,
                        str("%0 comments found (%1 bytes)", [unCondCount, contentLength]), what),
                    msg(conditionalCount == 0 ? 0 : 1,
                        str("%0 MSIE conditional comments found", [conditionalCount]), []) //this is n/a in MSIE
                ];
                return msgs;
            },
            "CSS Classes": function () {
                var what = _dp.getClassNames(), of = _dp.countBodyAll(),
                perc = Math.ceil(what.length * 100 / of),
                // TODO: nicer ?
                uniqueClassNames = [], classNamesLength = 0;
                for (var i = 0; i < what.length; i++) {
                    classNamesLength += what[i].length + 8; //class=""
                    uniqueClassNames = uniqueClassNames.concat(what[i].split(/\s+/));
                }
                (uniqueClassNames = unique(uniqueClassNames)).sort();
                // bytes overhead is not precise since it can be generated client side
                msgs = [
                    msg(perc > 33 /*|| classNamesLength > 1024*/ ? 1 : 0, str("%0% of elements (%1/%2) has css class specified (%3 bytes overhead)", [perc, what.length, of, classNamesLength])),
                    msg(0, str("%0 unique class names found", [uniqueClassNames.length]), uniqueClassNames) //TODO: level
                ];
                // TODO: inconsistent naming conventions
                // var hung, under, dash, other;
                // count each group of classnames and report inconsistent conventions

                var c, countOfConventions = 0, conventions = detectConventions(uniqueClassNames);
                for (c in conventions) if (conventions[c]) countOfConventions++;
                // "neutral" names are consistent with all conventions
                if (conventions["neutral"] && countOfConventions > 1) countOfConventions--;

                if (countOfConventions > 1)
                    msgs.push(msg(countOfConventions > 2 ? 1 : 0, str("Inconsistent class naming conventions, %0 different conventions found", [countOfConventions])));
                return msgs;
            },
            "IDs": function () {
                //TODO: REFACTOR with pervious
                var what = _dp.getIDs(), of = _dp.countBodyAll(),
                perc = Math.ceil(what.length * 100 / of),
                // TODO: nicer ?
                uniqueIDs = [], idsLength = 0;
                for (var i = 0; i < what.length; i++) {
                    idsLength += what[i].length + 5; //id=""
                    uniqueIDs = uniqueIDs.concat(what[i].split(/\s+/));
                }
                (uniqueIDs = unique(uniqueIDs)).sort();
                //TODO: list of duplicates as well !
                msgs = [
                    msg(perc > 33 /*  || idsLength > 1024*/ ? 1 : 0, str("%0% of elements (%1/%2) has ID specified (%3 bytes overhead)", [perc, what.length, of, idsLength])),
                    msg(0, str("%0 unique IDs names found", [uniqueIDs.length]), uniqueIDs) //TODO: level
                ];
                if (what.length - uniqueIDs.length)
                    msgs.push(msg(2, "Duplicate IDs on the page"));
                return msgs;
            },
            "DIVities": function () {
                var d = _dp.countDivs(), s = _dp.countSpans(), all = _dp.countBodyAll(),
                perc = Math.ceil((d + s) * 100 / all),
                overhead = d * 11 + d * 13;
                return [
                    msg(0, str("%0 DIVs", [d])),
                    msg(0, str("%0 SPANs", [s])),
                    msg(perc > 33 ? 1 : 0, str("%0% of elements (%1/%2) are DIVs and SPANs (%3 bytes overhead)", [perc, d + s, all, overhead]))
                // TODO: SPANs and DIVs with no textual content ?
                ];
            },
            "Inline Styles": function () {
                return [msg(0, "NOT IMPLEMENTED")];
                var what = _dp.getInlineStyles(), of = _dp.countBodyAll(),
                perc = Math.ceil(what.length * 100 / of),
                // TODO: nicer ?
                uniques = [], overhead = 0;
                for (var i = 0; i < what.length; i++) {
                    overhead += what[i].length + 8; //style=""
                    uniques = uniques.concat(what[i]);
                }
                (uniques = unique(uniques)); //.sort();
                msgs = [
                    msg(perc > 33 /*  || idsLength > 1024*/ ? 1 : 0, str("%0% of elements (%1/%2) has inline style (%3 bytes overhead)", [perc, what.length, of, overhead]), what)
                //, msg(0, str("%0 unique inline styles found", [uniques.length])) //TODO: level
                ];
                // TODO: how to detect incorrect style strings ? aka style="foobar" ?
                if (uniques.length != what.length)
                    msgs.push(msg(1, str("Some Duplicate inline styles found, all:%0, unique:%1", [what.length, uniques.length])));
                return msgs;
            },
            "Inline Event Handlers": function () {
                //return [msg(0, "NOT IMPLEMENTED")];
                var what = _dp.getInlineHandlers(), of = _dp.countBodyAll(),
                perc = Math.ceil(what.length * 100 / of),
                // TODO: nicer ?
                uniques = [], overhead = 0;
                for (var i = 0; i < what.length; i++) {
                    overhead += what[i].length + 8; //style=""
                    uniques = uniques.concat(what[i]);
                }
                (uniques = unique(uniques)); //.sort();
                msgs = [
                    msg(perc > 0 /*  || idsLength > 1024*/ ? 1 : 0, str("%0% of elements (%1/%2) has Inline Event Handler (%3 bytes overhead)", [perc, what.length, of, overhead]), what)
                //, msg(0, str("%0 unique inline styles found", [uniques.length])) //TODO: level
                ];
                // TODO: how to detect incorrect style strings ? aka style="foobar" ?
                if (uniques.length != what.length)
                    msgs.push(msg(1, str("Some Duplicate inline event handlers, all:%0, unique:%1", [what.length, uniques.length])));
                return msgs;
            },
            //TODO: nicer name
            "Inline Scripts": function () {
                var contentLength = 0, what = _dp.getInlineScripts();
                for (var i = 0; i < what.length; i++) {
                    contentLength += what[i].length;
                }
                return msgs = [
                //msg(what.length == 0 ? 0 : contentLength < 1000 ? 1 : 2,
                    msg(what.length == 0 ? 0 : what.length < 5 ? 1 : 1, // TODO: deper analysis of size, position etc... just warn now
                        str("%0 inline scripts found (%1 bytes of code is inline in the page)", [what.length, contentLength]), []/*what*/)
                ];
            }

        };
        var semantics = {
            "Languages": function () {
                var what = _dp.getLanguages();
                return msgs = [
                    msg(what.length == 0 ? 2 : 0, str("%0 lang attributes found", [what.length]), what)
                ];
            },
            "H37 - Using alt attributes on img elements": function () {
                var what = _dp.imagesWithoutAlt(), all = _dp.getTagCount("IMG");
                return msgs = [
                    msg(what.length != 0 ? 2 : 0, str("%0 images (%0/%1) without alt found", [what, all]), [])
                ];
            }

        };
        return {
            "General Info": general
            ,
            "Markup": markup
            ,
            "Security": security
            ,
            "Semantics & Accessibility": semantics
        };
    }
    function renderAll(results) {
        var html = "";
        for (var sectionName in results) {
            html += str("<h1>%0</h1>%1", [sectionName, rendererSection(results[sectionName])]);
        }
        return html;
    }
    function rendererSection(results) {
        function ul(arr) {
            var html = "", a;
            if (arr && arr.length) {
                html += "<ul>";
                for (var i = 0, l = arr.length; i < l; i++) {
                    a = arr[i];
                    html += str("<li class='%0'>%1 %2</li>", [
                        a.status,
                        a.msg,
                        a.extra ? "<pre><code>" + enc(a.extra.join("\r\n")) + "</code></pre>" : ""
                    ]);
                }
                html += "</ul>";
            }
            return html;
        }

        var templ = "<section><h2>%0</h2>%1<footer>time: %2 ms</footer></section>",
        name, html = "";
        for (name in results) {
            r = results[name];
            html += str(templ, [name, ul(r), r._time]);
        }
        return html;
    }
    function onload() {
        function measuringDelegate(ctx, f) {
            var that = function () {
                var d1 = new Date(),
                r = f.apply(ctx, arguments);
                that._time = new Date().valueOf() - d1;
                return r;
            };
            return that;
        }
        function run() {
            var a = analyzer(dataProvider(window.opener)),
            //TODo: extract method, optimize lookups
            results = {};
            for (var sectionName in a) {
                results[sectionName] = {};
                for (var methodName in a[sectionName]) {
                    //
                    var f = a[sectionName][methodName];
                    //results[sectionName][methodName] = f.apply(a);
                    //alert(methodName);
                    f = measuringDelegate(a, f);
                    results[sectionName][methodName] = f();
                    results[sectionName][methodName]._time = f._time;

                }
            }
            var html =
            //"<address>Designed by a.in.the.k@gmail.com</address>\
                "<nav><label><input id='toggleDetails' type='checkbox'>Toggle Details</label></nav>\
                <article id='summary'><h1>Summary</h1></article>\
                <article id='results'>"
                + renderAll(results)
                + "</article>";
            document.body.innerHTML = html;

            $("#toggleDetails").click(function () {
                $("PRE").slideToggle('linear');
            });
            // collect all warnings and errors
            var errors = $(".error,.warning");
            $("<UL>").appendTo("#summary").append(
                errors.clone().children().remove().end()
            );


        }
        //$(".progress").html("Running analysis...please wait");
        // TODO: restructure markup



        $(".progress").html("Running analysis...please wait");
        setTimeout(run, 100);
        //run();
    }

    onload();

} ());
//TODO: Detect Degrading Script Tags - http://ejohn.org/blog/degrading-script-tags/
//META "Generator"
//HTML 5 banned tags
//language = "JavaScript"
// TODO: doctype detected as comment in MSIE (HTML5)
// useless absolute URLs (take co zbytocne obsahuju protokol + hostname) priklad a href="http://www.sme.sk/cocitat/"
// useless classes


