/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("items")

  collection.fields.add(new Field({
    hidden: false,
    id: "file_item_photo",
    maxSelect: 1,
    maxSize: 5242880,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    name: "photo",
    presentable: true,
    protected: false,
    required: false,
    system: false,
    thumbs: ["80x80", "200x200"],
    type: "file",
  }))

  collection.fields.add(new Field({
    hidden: false,
    id: "bool_sample_printed",
    name: "sample_printed",
    presentable: false,
    required: false,
    system: false,
    type: "bool",
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("items")
  collection.fields.removeById("file_item_photo")
  collection.fields.removeById("bool_sample_printed")
  return app.save(collection)
})
