<template>
  <div>
    <div class="jsoneditor-vue" />
  </div>
</template>

<script>
import JsonEditor from '@json-editor/json-editor'
window.JSONEditor = JsonEditor
import Vue from 'vue'
window.Vue = Vue
// import { default as component } from 'vue-json-schema-editor'

// Vue.component('json-schema-editor', component);

export default {
  props: {
    value: {
      type: Object,
      default: () => {}
    },
    schema: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {
      editor: null,
      error: false,
      json: this.value,
      internalChange: false
    }
  },
  watch: {
    /* value: {
      handler: 'update'
    } */
  },
  mounted() {
    this.update()
  },
  methods: {
    update() {
      var options = {
        schema: this.schema,
        startval: this.value,
        theme: 'bootstrap4',
        iconlib: 'materialicons',
        required_by_default: true,
      }
      if (this.editor) {
        this.editor.destroy()
      }
      this.editor = new JsonEditor(this.$el.querySelector('.jsoneditor-vue'), options)
      let first = true
      this.editor.on('change', () => {
        if (first) {
          first = false
          return
        }
        this.$emit('input', this.editor.getValue())
      })
    },
    onSave() {
      this.$emit('json-save', this.json)
    }
  }
}

if (typeof JSONEditor !== 'undefined' && JSONEditor && false) {
  console.log('aaaaaaa')
  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === "object" && schema.format === "schema") {
      return "schema";
    }

    // If no valid editor is returned, the next resolver function will be used
  });

  JSONEditor.defaults.editors.schema = JSONEditor.AbstractEditor.extend({
    setValue: function(value) {
      this.value = value;
      console.log('setValue2')
      if (value && Object.keys(value).length > 0) {
        console.log(value.properties)
        console.log(this.schemaeditor)
        let av = arrayifyJSONSchema(value);
        Vue.set(this.schemaeditor.$props, 'value', av);
        // this.schemaeditor.$emit('updateValue', arrayifyJSONSchema(value))
        // this.schemaeditor.data.$props.$set('value', arrayifyJSONSchema(value))
        // this.schemaeditor.$forceUpdate()
        // return this.schemaeditor.$data.value = arrayifyJSONSchema(value);
      }
      this.onChange();
    },
    getValue: function() {
        console.log('getting');
        if (typeof this.schemaeditor != 'undefined' && this.schemaeditor.$data.value)
            return objectifyJSONSchema(this.schemaeditor.$data.value);
        else
            return {}
    },
    register: function() {
      console.log('register');
      this._super();
      if(!this.input) return;
      this.input.setAttribute('name', this.formname);
    },
    unregister: function() {
      this._super();
      if(!this.input) return;
      this.input.removeAttribute('name');
    },
    getNumColumns: function() {
      return 12;
    },
    build: function() {
      console.log('build');
      var self = this;
      if(!this.options.compact) {
        this.label = this.header = this.theme.getFormInputLabel(this.getTitle());
      }
      if(this.schema.description) this.description = this.theme.getFormInputDescription(this.schema.description);
      if(this.options.compact) this.container.className += ' compact';

      const componentClass = Vue.extend(component);
      this.schemaeditor = new componentClass({
        propsData: { "value": { type: "object" } },
      });
      this.schemaeditor.$mount();
      this.input = this.schemaeditor.$el
      console.log(this.input)

      this.control = this.theme.getFormControl(this.label, this.input, this.description);

      if(this.schema.readOnly || this.schema.readonly) {
        this.always_disabled = true;
        this.input.disabled = true;
      }

      console.log('----2')
      this.container.appendChild(this.control);
      console.log(this.container)
      console.log(this.control)
      console.log(this.input)


      /*this.schemaeditor = new Vue({
        el: '#js-schema-edit',
        render: function (createElement) {
            return createElement(
              'json-schema-editor',   // tag name
              {
                attrs: {
                  "v-on:change": "changed()",
                  ":value": "value",
                },
                props: {
                  "value": { type: "object" },
                },
              }
            )
        },
        data: {
          value: {
            type: 'object'
          }
        },
        methods: {
          changed() {
            self.onChange(true);
          }
        }
      })*/
      global.se = this.schemaeditor;
      console.log('d')
    },
    enable: function() {
      if(!this.always_disabled) {
        this.input.disabled = false;
      }
      this._super();
    },
    disable: function() {
      this.input.disabled = true;
      this._super();
    },
    destroy: function() {
      if(this.label && this.label.parentNode) this.label.parentNode.removeChild(this.label);
      if(this.description && this.description.parentNode) this.description.parentNode.removeChild(this.description);
      if(this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input);
      this._super();
    }
  });
}
</script>
<style>
  .jsoneditor-vue button.btn {
    font-size: 14px !important;
    padding: 3px;
  }
  .jsoneditor-vue .form-control-label, label {
    font-weight: bold;
  }
  .jsoneditor-vue input[type="checkbox"] {
    margin-right: 5px;
    margin-top: 3px;
  }
  .jsoneditor-vue textarea {
    resize: both;
  }
</style>
