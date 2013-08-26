JADE = $(shell find *.jade)
HTML = $(JADE:.jade=.html)

all: $(HTML)

%.html: %.jade
	node_modules/jade/bin/jade < $< --path $< > $@

clean:
	rm -f $(HTML)

.PHONY: clean