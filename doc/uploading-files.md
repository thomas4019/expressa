## Uploading files

Lets say you want your blog posts to contain images.
Here's how you add an image file-upload in `data/collection/post.json`:

    "properties":{

      ...

      "picture": {
          "title": "Picture",
          "type": "string",
          "media": {
              "binaryEncoding": "base64",
              "type": "image/png"
          }
      }

> NOTE: you probably want to create an expressa listener which hides the 'picture'-property to save bandwidth. On top of that, you probably want automatic thumbnails using something like [this expressa middleware](https://gist.github.com/coderofsalvation/d3c67fbdf4639dfae4d292a37434097c)

![](https://gist.githubusercontent.com/coderofsalvation/f9af1791560bdcde2e536ba6ee85fd66/raw/86bfd8821d4c426a8404ff10ea1164b4f171ea8c/file-upload.png)

    "properties":{

      ...

      "file": {
        "type": "string",
        "format": "file",
        "title": "File"
        "links": [
          {
            "rel": "Download File",
            "href": "/custom_endpoint/{{self}}",
            // Can also set `download` to a string as per the HTML5 spec
            "download": true
          }
        ]
      }

> NOTE: the links probably will need a custom endpoint which serves the file with the proper media type 

    expressa.get('/files/:file',function(req,res,next){
        var file = .... // get file
        res.writeHeader(200, {
          "Content-Type":"image/png"
        })
        res.send(file)
    })

For more info on the "links"- of "media"-property see [json-editor](https://github.com/jdorn/json-editor)

> TODO: more examples (like listeners proxying the base64 string to S3 Bucket or a local folder)
