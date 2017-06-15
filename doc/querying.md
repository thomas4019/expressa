## Querying

The endpoints that return lists of documents support several parameters that modify the results

|  parameter  |  value  |                    description                    |
|-------------|---------|---------------------------------------------------|
| limit       | number  | Returns at most this many documents               |
| offset      | number  | Exclude the first n documnents from the output    |
| orderby     | object  | Sort according to the mongo query. Ex: {"title": 1} will sort with the title ascending. |
| orderby     | array   | Sort according to the listed fields and optional direction. Ex: ["title"] will sort by title ascending. ["title", "datetime"] will sort by title and then by date both ascending. Each element can be an array with a second parameter that species the direction. Ex: ["title", ["datetime", -1]] will sort by title ascending and then by datetime *descending*. |