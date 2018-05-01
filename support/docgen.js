/**
 * This script generates the supported devices page.
 * Run by executing: npm run docs
 */

const zigbee2mqtt = require('../lib/converters/zigbee2mqtt');
const deviceMapping = require('../lib/devices');
const fs = require('fs');
const YAML = require('json2yaml');

// Sanity check if all supported devices are in deviceMapping
const supportedDevices = new Set();
zigbee2mqtt.forEach((p) => supportedDevices.add(...p.devices));

// Check if in deviceMapping.
supportedDevices.forEach((s) => {
    if (!Object.values(deviceMapping).find((d) => d.model === s)) {
        console.log(`ERROR: ${s} not in deviceMapping`);
    }
});

const outputdir = process.argv[2];

if (!outputdir) {
    console.error("Please specify an output directory");
}

let file = 'Supported-devices.md';
let text = '*NOTE: Automatically generated by `npm run docgen`*\n';
text += `
In case you own a Zigbee device which is **NOT** listed here, please see [How to support new devices](https://github.com/Koenkk/zigbee2mqtt/wiki/How-to-support-new-devices).
\n`;

const logDevices = (devices) => {
    let result = '';
    result += '| Model | Description | Picture |\n';
    result += '| ------------- | ------------- | -------------------------- |\n';

    devices.forEach((device) => {
        result += `| ${device.model} | ${device.vendor} ${device.description} (${device.supports}) | ![${device.model}](images/devices/${device.model.replace('/', '-')}.jpg) |\n`;
    });

    return result;
}

const vendors = Array.from(new Set(Object.values(deviceMapping).map((d) => d.vendor)));
vendors.sort();
vendors.forEach((vendor) => {
    text += `### ${vendor}\n`;
    text += logDevices(Object.values(deviceMapping).filter((d) => d.vendor === vendor));
    text += '\n';
})

fs.writeFileSync(outputdir + '/' + file, text);


file = 'Integrating-with-Home-Assistant.md';
text = '*NOTE: Automatically generated by `npm run docgen`*\n\n';
text += 'The easiest way to integrate zigbee2mqtt with Home Assistant is by using [MQTT discovery](https://www.home-assistant.io/docs/mqtt/discovery/).'
text += ' To enable MQTT discovery set `homeassistant: true` in your zigbee2mqtt `configuration.yaml` and add the following to your Home Assistant `configuration.yaml`.\n'
text += '```yaml\n'
text += 'mqtt:\n'
text += '  discovery: true\n'
text += '```\n'

text += '\n\n'

text += 'To respond to button clicks you can use the following Home Assistant configuration:\n'
text += '```yaml'
text += `
automation:
  - alias: Respond to button clicks
    trigger:
      platform: mqtt
      topic: 'zigbee2mqtt/<FRIENDLY_NAME'
    condition:
      condition: template
      value_template: "{{ 'single' == trigger.payload_json.click }}"
    action:
      entity_id: light.bedroom
      service: light.toggle
`
text += '```\n'

text += 'In case you **dont** want to use Home Assistant MQTT discovery you can use the configuration below.\n\n'

const homeassistantConfig = (device) => {
    const payload = {
        platform: 'mqtt',
        state_topic: "zigbee2mqtt/<FRIENDLY_NAME>",
        availability_topic: "zigbee2mqtt/bridge/state",
        ...device.discovery_payload,
    };

    if (payload.command_topic) {
        payload.command_topic = `zigbee2mqtt/<FRIENDLY_NAME>/set`;
    }

    let yml = YAML.stringify([payload]);
    yml = yml.replace(/(-) \n    /g, '- ');
    yml = yml.replace('---', `${device.type}:`)
    return yml;
}

Object.values(deviceMapping).forEach((device) => {
    text += `### ${device.model}\n`;
    text += '```yaml\n'

    device.homeassistant.forEach((d, i) => {
        text += homeassistantConfig(d);
        if (device.homeassistant.length > 1 && i < device.homeassistant.length - 1) {
            text += '\n';
        }
    })

    text += '```\n\n';
});

fs.writeFileSync(outputdir + '/' + file, text);
