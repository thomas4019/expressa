## Permissions

Expressa lets you easily manage CRUD permissions for each type of action on collections using admin interface. Users can have one or more roles and each role is given ability to create, read, update, delete, etc.

By default you start with the following roles (but you can add your own):

 * **Admin**: this is the "super user" role that lets you manage all data.
 * **Authenticated**: any signed-in user
 * **Anonymous**: permissions given to all requests that come from non-signed in users

You can declare collections as having documents that are owned. This lets you manage permissions for editing, reading, and deleting a user's own documents.

Here's a screenshot example of the admin UI for managing permissions on a "post" collection.

![post permissions](https://cloud.githubusercontent.com/assets/406149/15307975/8c609530-1b95-11e6-9888-36a76a9a8248.png)