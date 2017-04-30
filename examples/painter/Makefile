
SHELL := /bin/bash
PATH  := ./node_modules/.bin:$(PATH)

.PHONY: preview
preview: node_modules protocol/service.d.ts protocol/service.js
	wintersmith preview --chdir client

protocol/service.js: node_modules protocol/service.proto
	pbjs -t static-module -w commonjs protocol/service.proto -o protocol/service.js

protocol/service.d.ts: node_modules protocol/service.js
	pbts -o protocol/service.d.ts protocol/service.js

node_modules:
	npm install

.PHONY: clean
clean:
	rm -f protocol/service.js
	rm -f protocol/service.d.ts

.PHONY: distclean
distclean: clean
	rm -rf node_modules
