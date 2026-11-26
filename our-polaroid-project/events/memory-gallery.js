import {createPolaroidMemoryViewer} from '../memory-viewer.js?v=20261126-stars49';

// Only records already admitted by OlaGallery's public/selection filters enter here.
export function eventMemoryPhotos(photos, resolve) {
  return photos.map(photo => {
    const download = photo.downloadAvailable === false ? '' : resolve(photo.download);
    const inline = download ? new URL(download) : null; inline?.searchParams.set('inline', '1');
    return ({
    sourceId:photo.id, src:photo.displayAvailable === false ? '' : resolve(photo.display),
    alt:photo.caption, date:photo.date, location:photo.location, story:photo.story,
    download, inline:inline?.href, inlineLabel:photo.inlineLabel,
    filename:photo.originalFilename, downloadAvailable:photo.downloadAvailable !== false,
    downloadLabel:photo.downloadLabel || 'Download original', downloadNote:photo.downloadNote
  }); });
}

export async function createEventMemoryViewer(gallery, resolve) {
  const photos = eventMemoryPhotos(gallery.photos, resolve);
  const event = gallery.event;
  const context = {collection:event.title,
    description:[event.dateLabel && 'Event date: ' + event.dateLabel,
      event.location && 'Event location: ' + event.location, event.description].filter(Boolean).join('\n\n')};
  const viewer = await createPolaroidMemoryViewer({
    loop:false,
    onNavigate:item => {
      gallery.index = item.position;
      history.replaceState(history.state, '', '#photo=' + encodeURIComponent(item.id));
    },
    onClose:() => { if (new URLSearchParams(location.hash.slice(1)).has('photo')) gallery.closePhoto(); },
    onShare:(_, status) => gallery.share(status)
  });
  return {
    open(index, opener) { if (!photos[index]?.src) return false; return viewer.open(photos, index, opener, context); },
    close:() => viewer.close(), destroy:() => viewer.destroy()
  };
}
