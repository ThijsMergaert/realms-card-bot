const csv = require('csvtojson');

class Gallery {
    async parseGallery(filename) {
        this.gallery = await csv().fromFile(filename);
        console.log(this.gallery[0]);
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

const gallery = new Gallery();
gallery.parseGallery("D:\\Users\\Livor\\Documents\\Hero Realms\\Hero Realms Card Gallery - Images - Card Gallery.csv")
    .then(() => {
        return gallery.searchGallery("Shield");
    });
