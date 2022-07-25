// Use this route to post an ad

import {IncomingForm} from 'formidable'; // We need this to process the uploaded images
const ip = require('ip');

const sharp = require('sharp');
const probe = require('probe-image-size');
import {v4 as uuidv4} from 'uuid';

// Make sure the body parser is turned off, otherwise it won't work!
export const config = {
    api: {
        bodyParser: false,
    }
};

export default async function handler(req, res) {

    const data = await new Promise((resolve, reject) => {

        const form = new IncomingForm();

        form.parse(req, async (err, fields, files) => {

            // Process all inputs and uploaded images here

            const countryCode = fields.countryCode;
            // Use to get country code ID

            const typeId = parseInt(fields.typeId); // Should be 0, 1, or 2 (local only, local or remote, remote only)
            const types = [0, 1, 2];
            if (!types.includes(typeId))
                return res.json({success: false, message: 'type invalid'});

            let latitude = null;
            let longitude = null;

            if (typeId !== 2) {
                const postalCode = fields.postalCode;
                if (!postalCode)
                    return res.json({success: false, message: 'postalCode invalid'});
                // Get postal code, then latitude and longitude (use CSV files)
            }

            let title = fields.title;
            if (!title)
                return res.json({success: false, message: 'title invalid'});
            title = title.trim();

            let description = fields.description;
            if (!description)
                return res.json({success: false, message: 'description invalid'});
            description = description.trim();
            const breakTag = '<br>';
            description = (description + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2'); // get HTML version of description for display later

            // Get the optional price
            let price = null;
            if (Boolean(fields.addPrice)) {
                if (Boolean(fields.makeFree)) {
                    price = 0;
                } else {
                    price = fields.price;
                    if (!price)
                        return res.json({success: false, message: 'price invalid'});
                    price = parseFloat(price);
                }
            }

            let tags = null;
            if (Boolean(fields.tags.length))
                tags = fields.tags;

            let emailAddress = fields.emailAddress;
            if (!emailAddress)
                return res.json({success: false, message: 'emailAddress invalid'});

            emailAddress = emailAddress.trim().toLowerCase(); // store all email addresses lower case

            // Get email address ID (select or insert)

            const repliesEnabled = Boolean(fields.repliesEnabled);

            const tronOwnerAddress = fields.tronOwnerAddress;

            const ipAddress = ip.address(); // Get IP address for accountability

            // Validate tron owner address if provided (optional)

            const createdTimestamp = Date.now(); // Get the timestamp for storage

            ////////////////////////////// PROCESS UPLOADED IMAGES //////////////////////////////

            const images = files.images;
            const imageData = fields.imageData; // Includes image order by name and associated captions

            const imageFileData = [];

            for (const imageDatum of imageData) {
                const filename = value.filename;
                const caption = value.caption.trim();
                const image = images.find(value => value.name === filename);
                const tmpImage = image.filepath;
                const mimetype = image.mimetype;

                if (mimetype.split('/')[0] !== 'image') {

                    let imageFilename = '';

                    let imageProbe = require('fs').readFileSync(tmpImage);

                    imageProbe = probe.sync(imageProbe);

                    // Get image properties for optimization
                    let width = 1920;
                    let height = 1080;

                    const imageWidth = parseInt(imageProbe.width);
                    const imageHeight = parseInt(imageProbe.height);

                    imageFilename = uuidv4() + '.jpeg'; // Generate random filename for image
                    const savePath = 'public/images/' + imageFilename;

                    imageFileData.push({name: imageFilename, caption: caption}); // Prepare for db column

                    if (imageWidth > width || imageHeight > height) {
                        // Resize image (optimize)
                        const ratio = imageWidth / imageHeight;
                        if (width / height > ratio) {
                            width = height * ratio;
                        } else {
                            height = width / ratio;
                        }
                        await sharp(tmpImage)
                            .resize(width, height)
                            .toFormat('jpeg', {mozjpeg: true})
                            .toFile(savePath);
                    } else {
                        // Leave image alone (do not optimize)
                        await sharp(tmpImage)
                            .toFormat('jpeg', {mozjpeg: true})
                            .toFile(savePath);
                    }
                }
            }
        });
    });
};