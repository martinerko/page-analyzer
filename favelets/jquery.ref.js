(function ($) {
    /*
    author: a.in.the.k@gmail.com
    Licencing: send thanx or complaints 
    to ainthek.blogspot.com or @ainthek
    -----------------------------------------
    MSIE sometimes returns unnormalized .src or .href property 
    for LINK and SCRIPT tags, it has not been observed on a.href
    example: s.src returns "sss" instead of ptoto://auth/sss
    this is observable always on "some" pages and "some" elements
    in case .src does not work 
    -> getAttribute('src',4) works
    when .src works (returns abs. uri),
    -> getAttribute('src',4) does not work and returns (raw)
    TODO: detect, dont do always, 
    TODO: study reason why this happens
    no check for tagname or property name, 
    incorrect like HEAD.href or A.SRC produce
    undefined bahavior
    */
    var re = /^[A-Z][0-9A-Z+\-\.]*:/i;
    function getUriRef(element, attrName) {
        ///	<summary>
        ///		Access href and src attributes of 
        ///     SCRIPT, LINK and A elements in consistent way.
        ///     see source code or http://ainthek.blogspot.com 
        ///     for description of problem.
        ///	</summary>
        ///	<returns type="String" />
        ///	<param name="attrName" type="String" optional="true" mayBeNull="false">
        ///		"href" or "src" attribute, if not specified then autodetected detected 
        ///	</param>
        var uri = element[attrName || ("href" in element ? "href" : "src" in element ? "src" : "action")]; //TODO: form action ?
        if (uri != null && !re.test(uri)) {
            //TODO: TEST XB for additional param, 
            // but i don;t expect any normal browser to fail here
            uri = element.getAttribute(attrName, 4);
        }
        return uri;
    };

    $.ref = getUriRef;
    // returns jQuery in setter and text in getter
    $.fn.ref = function (attrName) {
        ///	<summary>
        ///		Access href and src attributes of first set element
        ///     SCRIPT, LINK and A elements in consistent way.
        ///     Links should be converted from "uri-reference" to "URI".
        ///     Means they will have scheme part (sometimes called absolute URIs) 
        ///     Tested for http: protocol mostly.
        ///     see source code or http://ainthek.blogspot.com 
        ///     for description of problem.
        ///	</summary>
        ///	<returns type="String">
        ///     "" if empty set or if attrName not exists.
        ///     
        /// </returns>
        ///	<param name="attrName" type="String" optional="true" mayBeNull="false">
        ///		"href" or "src" attribute, if not specified then autodetected detected 
        ///	</param>
        var e = this[0];
        return e ? getUriRef(e, attrName) : "";
    };
})(jQuery);
