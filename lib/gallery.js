const csv = require('csvtojson');

class Gallery {
    async parseGallery(filename) {
        this.gallery = await csv().fromFile(filename);
        for(const entry of this.gallery) {
            entry.Text = entry.Text.replace(/(\r\n|\n|\r)/gm,"<br>")
        }
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
