# Broadlink Adapter

This add-on provides an adapter which adds ir devices to the Mozilla
IoT Gateway

## Installation

You can install Broadlink Adapter from gateway plugins page.

## Configuration

By default, the broadlink-adapter has no ir device.
You need edit configuration to control ir devices according to the following steps

### Record ir codes

The first step, you record ir codes using a broadlink device.
Exucute the following comand and answer displayed questions.

```shell
cd ~/.mozilla-iot/addons/broadlink-adapter
node asset/learncode
```

If you answer questions till the end, JSON will be output to console.
For example, the following JSON is output when recording dimbleLight's ir code.

```js
{
    "mac": "34:ea:34:c7:b2:ec",
    "type": "dimbleLight",
    "id": "dimbleLight01",
    "name": "Living dimbleLight",
    "ir": {
        "on": "26005000000124911311141114111411141114111411143513111435133513351311143513351311143513111411141114351311141114111411143513351335131114351335133513000d05",
        "off": "26005000000124911311141114111411141114111411143513111435133513351311143513351311141114111411141114111411141114111435133513351335133513351335133513000d05",
        "levelUp": "26005000000124911311141114111411141114111411143513111435133513351311143513351311143513111435131114111411141114111411143513111435133513351335133513000d05",
        "levelDown": "26005000000124911311141114111411141114111411143513111435133513351311143513351311141114351335131114111411141114111435131114111435133513351335133513000d05"
    },
    "onLevel": 100,
    "levelStep": 5
}
```

### Add recorded ir codes to config

Open config and insert JSONs in the devices array. 

```shell
cd ~/mozilla-iot/gateway/tools
./config-editor.py broadlink-adapter -e

{
    "devices": [
        // add JSONs here
    ]
}
```

If add multiple recorded ir codes, add recorded JSONs according to JSON format.

```js
{
    "devices": [
        {
            "type": "dimbleLight",
            //first recorded json
        },
        {
            "type": "thermostat",
            //second recorded json
        },
    ]
}
```


## supported IR device types

Broadlink-adapter supports the following device types.
- thermostat
- dimbleLight
- light
- switch

You can see configuration samples in the example directory.


## ToDo
- web configuration screen