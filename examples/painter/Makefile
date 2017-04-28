
SHELL := /bin/bash
PATH  := ./node_modules/.bin:$(PATH)

.PHONY: preview
preview: node_modules proto
	node server.js &
	wintersmith preview

.PHONY: proto
proto: node_modules
	pbjs -t static-module -w commonjs service.proto -o contents/protocol.js
	pbts -o contents/protocol.d.ts contents/protocol.js

node_modules:
	npm install

.PHONY: clean
clean:
	rm -f contents/protocol.js

.PHONY: distclean
distclean: clean
	rm -rf node_modules
