-- PDF faktury umí jen PNG a JPG, proto WEBP pro logo nepovolujeme.
update storage.buckets set allowed_mime_types = array['image/png', 'image/jpeg'] where id = 'loga';
