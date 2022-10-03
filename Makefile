env:
	sudo chmod +x fift
	sudo chmod +x func
	sudo chmod +x lite-client

	sudo cp ./func /usr/local/bin/func
	sudo cp ./fift /usr/local/bin/fift
	sudo cp ./lite-client /usr/local/bin/lite-client


	mkdir ./fiftlib/
	unzip fiftlib.zip -d ./fiftlib/
	sudo mkdir -p /usr/local/lib/fiftlib
	sudo cp ./fiftlib/* /usr/local/lib/fiftlib
	rm -rf fiftlib

	export FIFTPATH=/usr/local/lib/fiftlib
