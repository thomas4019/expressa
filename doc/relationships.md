## Relationships & References 

Let's suppose we want to extend our `/data/collection/users.json`-collection, by specifying which user belongs to another user:

    { 
      "properties":{
        "other_user":{            
          "title": "Has relationship with",
          "type": "string",·     
          "links": [             
              {                  
                "rel": "» show profile",        
                "href": "/admin/#/edit/users/{{self}}", 
                "class": "comment-link open-in-modal primary-text"
              }
          ]
        }

        ...        

      } 
    }

Done, now expressa-admin will show a textfield in which we can write the userid:

![](https://gist.githubusercontent.com/coderofsalvation/1ea3f6fad8a880b45b1a23917f9975b5/raw/d828acb18ff1cb5c6e3b9319b813e996cfbfda8f/reference_2.png)


## Dynamically generated Relationships

To make things extra convenient, lets generate a dropdown of all users:

      expressa.addListener('get', -101, function(req,collection,doc){
        if( req.url.match(/\/users\/schema$/) != null ) {
          // add user reference to schema      
          var schema = {             
            "enumSource": [{         
                // A watched field source       
                source: [],          
                title: "{{item.title}}",        
                value: "{{item.id}}" 
            }]
          }
          return new Promise( function(resolve, reject ){
            expressa.db.users.find() 
            .then( function(users){  
              users.map( function(u){·
                schema.enumSource[0].source.push({title: u.firstname+" "+u.lastname+", "+u.email,id:u._id})·
              })
              doc.properties.id_parent.enumSource = schema.enumSource
              return resolve({"code":200, "message":doc})
            })
            .catch(reject)                                                                                                                                                                                                                                                                                                           
          })  
        }  
      }

Done, now we'll have a nice dropdown to select our relationship:


![](https://gist.githubusercontent.com/coderofsalvation/1ea3f6fad8a880b45b1a23917f9975b5/raw/d828acb18ff1cb5c6e3b9319b813e996cfbfda8f/reference_1.png)

> For more info on enumSource see the [json-editor docs](https://github.com/jdorn/json-editor)

> TIP: use [expressa-folder](https://npmjs.org/package/expressa-folder) to automatically map listeners to files.
