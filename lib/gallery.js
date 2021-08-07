const csv = require('csvtojson');
const request = require('request');

class Gallery {
    async parseGallery(url) {
        this.gallery = await csv().fromStream(request.get(url));
    }

    async searchGallery(searchString) {
        const entries = [];
        this.gallery.forEach((entry, index) => {
            if (entry['Name'].toLowerCase().includes(searchString.toLowerCase())) {
                entries.push({entry, index});
            }
        });
        return entries;
    }

    async getGalleryItem(galleryId) {
        return this.gallery[galleryId];
    }
}

exports.Gallery = Gallery;
