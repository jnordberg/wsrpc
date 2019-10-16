
SHELL := /bin/bash
PATH  := ./node_modules/.bin:$(PATH)

PROTO_FILES := $(wildcard protocol/*.proto)
PROTO_DEFS  := $(PROTO_FILES:.proto=.d.ts)
SRC_FILES   := $(wildcard src/*.ts)

.PHONY: lib
lib: lib3 lib6

.PHONY: proto
proto: $(PROTO_DEFS)

.PHONY: coverage
coverage: node_modules
	nyc -r html -r text -e .ts -i ts-node/register -n "src/*.ts" mocha --reporter nyan --require ts-node/register test/*.ts

.PHONY: test
test: node_modules $(PROTO_DEFS)
	mocha --require ts-node/register test/*.ts

.PHONY: ci-test
ci-test: node_modules $(PROTO_DEFS)
	tslint -p tsconfig.json -c tslint.json
	nyc -r lcov -e .ts -i ts-node/register -n "src/*.ts" mocha --reporter tap --require ts-node/register test/*.ts

.PHONY: lint
lint: node_modules
	tslint -p tsconfig.json -c tslint.json -t stylish --fix

lib6: $(PROTO_DEFS) $(SRC_FILES) node_modules
	tsc -p tsconfig.json -t es6 --outDir lib6
	touch lib6

lib3: $(PROTO_DEFS) $(SRC_FILES) node_modules
	tsc -p tsconfig.json -t es3 --outDir lib3
	touch lib3

protocol/%.d.ts: protocol/%.js node_modules
	pbts -o $@ $<

.PRECIOUS: protocol/%.js
protocol/%.js: protocol/%.proto node_modules
	pbjs -r $(basename $(notdir $<)) -t static-module -w commonjs -o $@ $<

node_modules:
	yarn

.PHONY: docs
docs: node_modules
	typedoc --gitRevision master --target ES6 --mode file --out docs src
	find docs -name "*.html" | xargs sed -i '' 's~$(shell pwd)~.~g'
	echo "Served at <https://jnordberg.github.io/wsrpc/>" > docs/README.md

.PHONY: clean
clean:
	rm -rf lib3/
	rm -rf lib6/
	rm -f protocol/*.js
	rm -f protocol/*.d.ts

.PHONY: distclean
distclean: clean
	rm -rf node_modules
