const csv = require('csvtojson');
const request = require('request');
const { Index } = require('flexsearch');

class Gallery {
    async parseGallery(url) {
        this.index = new Index({tokenize: 'forward'});
        this.gallery = await csv().fromStream(request.get(url));
        await Promise.all(this.gallery.map((card, id) => this.index.add(id, card.Name)));
    }

    async searchGallery(searchString, limit) {
        return await this.index.search(searchString, limit);
    }

    async getGalleryItem(galleryId) {
        return this.gallery[galleryId];
    }
}

exports.Gallery = Gallery;
