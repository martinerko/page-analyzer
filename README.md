# page-analyzer


Bunch of analyses running over current HTML page.
Implemented  as bookmarklet (or favelet if you want).


## Try

Go to [install page](https://gratex.github.io/page-analyzer/favelets/analyzer/install.html)

## Currently supported detectors (mixed)

- Doctype
- Compatibility Mode
- Content-Type
- Content Length
- Script Accessible Cookies
- Sensitive Script Accessible Cookies
- External Scripts
- Sensitive information in links
- Server Banners
- Client Banners
- Tag Statistics
- Nesting Levels
- Comments
- CSS Classes
- IDs
- DIVities
- Inline Styles
- Inline Event Handlers
- Inline Scripts
- Languages
- H37 - Using alt attributes on img elements
- .... see source code please

## History
Horror code. This is one of my (ainthek) very very old projects. Was supporting also IE 5,6,7 in the dark ages (not all history committed here).

## Future
Rewrite, reuse other algorithms, and add more detections, support node.js server side usage as well.