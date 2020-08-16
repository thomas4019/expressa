Modules are defined in modules/<module name>/<module name>.js and can export the following fields:

| Field Name     | Type     | Purpose                                                   |
|----------------|----------|-----------------------------------------------------------|
| settingsSchema | object   | Properties to be added to the settings JSON schema object |
| collections    | object[] | List of collections to be added on install                |
| install        | function | Function to be called once, on install                    |
| permissions    | string[] | List of permissions                                       |
| init           | function | Function to be called on application startup              |