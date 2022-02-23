const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;


const otacommon = require('zigbee-herdsman-converters/lib/ota/common');
const assert = require('assert');

const otaurl = 'http://betacs.101.com/v0.1/static/preproduction_content_ndcast_ota/ota/z3/5678-1234/5678-1234.json';
const ndota = {    
    getImageMeta: async function (current, logger, device) {
        const modelId = device.modelID;
        const imageType = current.imageType;
        const manufacturerCode = current.manufacturerCode;
        const manufacturerName = device.manufacturerName;
        const images = (await otacommon.getAxios().get(otaurl)).data;
    
        // NOTE: Officially an image can be determined with a combination of manufacturerCode and imageType.
        // However Gledopto pro products use the same imageType (0) for every device while the image is different.
        // For this case additional identification through the modelId is done.
        // In the case of Tuya and Moes, additional identification is carried out through the manufacturerName.
        const image = images.find((i) => i.imageType === imageType && i.manufacturerCode === manufacturerCode &&
            (!i.modelId || i.modelId === modelId) && (!i.manufacturerName || i.manufacturerName.includes(manufacturerName)));
    
        assert(image !== undefined, `No image available for imageType '${imageType}'`);
        return {
            fileVersion: image.fileVersion,
            fileSize: image.fileSize,
            url: image.url,
            sha512: image.sha512,
        };
    },
    
    /**
     * Interface implementation
     */
    
    isUpdateAvailable: async function (device, logger, requestPayload=null) {
        return otacommon.isUpdateAvailable(device, logger, otacommon.isNewImageAvailable, requestPayload, this.getImageMeta);
    },
    
    updateToLatest: async function (device, logger, onProgress) {
        return otacommon.updateToLatest(device, logger, onProgress, otacommon.getNewImage, this.getImageMeta);
    }
    
}


const definition = [
    {
        zigbeeModel: ['ND.IoT.SW.4in1'],
        model: 'CLQYHD5SW01',
        vendor: 'NetDragon',
        description: 'NetDragon light switch for CL QYH D5',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'), e.switch().withEndpoint('l4')
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        ota: ndota,
    }
]


module.exports = definition