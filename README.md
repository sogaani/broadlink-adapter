# Broadlink Adapter

This add-on provides an adapter which adds ir devices to the Mozilla
IoT Gateway

## Installation

```shell
cd ~/mozilla-iot/gateway/src/addons
git clone https://github.com/sogaani/broadlink-adapter.git
cd broadlink-adapter
npm install
sudo systemctl restart mozilla-iot-gateway.service
```

## Add IR Device

By default, the broadlink-adapter has no ir device.

you need edit configuration to control ir devices.

```shell
cd ~/mozilla-iot/gateway/tools
./config-editor.py broadlink-adapter -e
{
    "devices": []
}
```

You can add ir device by JSON format.
For example, the following configuration would have dimbleLight.
```shell
{
    "devices": [
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
    ]
}
```

Broadlink-adapter supports the following device types.
- thermostat
- dimbleLight
- light
- switch

You can see configuration samples in the example directory.

## ToDo
- tool which learn code and add ir device.