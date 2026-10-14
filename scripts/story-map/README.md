# Our Story map data

`assets/our-story-map.js` holds the geography the Our Story map draws: the Paradise Valley and Scottsdale town lines, Camelback Mountain (Echo Canyon), Papago Park and the Phoenix Mountains Preserve, the Arizona Canal, the freeways and the main roads. Everything is SVG path data in an 800 x 500 view with true proportions (south 33.445, north 33.650, centred on -111.96). Nothing is fetched by visitors: the page draws it from this file, so the Privacy page needs no map service.

Data is from OpenStreetMap (© OpenStreetMap contributors, ODbL); the map's caption credits it.

To rebuild (only if the view or the features change), save these into one folder and run `python3 scripts/story-map/mapgen.py <folder> mapdata.json`, then paste the JSON into `assets/our-story-map.js`:

- `towns.json`, `motorways.json`, `roads.json`: Overpass API (`out geom`) for the admin_level 8 relations named Paradise Valley and Scottsdale; `way[highway=motorway]` in (33.44,-112.12,33.66,-111.80); and the primary/secondary ways named Camelback Road, Indian School Road, Lincoln Drive, Shea Boulevard, Scottsdale Road, 44th Street, 24th Street, Tatum Boulevard, Thomas Road, McDowell Road, Central Avenue, Hayden Road, Bell Road and McDonald Drive in the same box.
- `nom_preserve.json`, `nom_echo.json`, `nom_papago.json`, `nom_canal.json`: Nominatim search with `polygon_geojson=1&polygon_threshold=0.0003` for "Phoenix Mountains Preserve", "Echo Canyon Recreation Area", "Papago Park, Phoenix" and "Arizona Canal".

The home pins are not in this file. They sit at neighborhood centres in `src/our-story.html` (`NBR`), never at addresses.
