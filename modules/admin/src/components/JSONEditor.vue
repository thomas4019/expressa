<template>
  <div>
    <div class="jsoneditor-vue" />
  </div>
</template>

<script>
import JsonEditor from '@json-editor/json-editor'
import 'json-schema-editor'
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

if (JsonEditor) {
  JsonEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'object' && schema.format === 'schema') {
      return 'schema'
    }

    // If no valid editor is returned, the next resolver function will be used
  })

  JsonEditor.defaults.editors.schema = JsonEditor.AbstractEditor.extend({
    setValue: function(value, initial) {
      this.value = value
      this.schemaeditor.setValue(value)
      this.onChange()
    },
    getValue: function() {
      if (typeof this.schemaeditor !== 'undefined') { return this.schemaeditor.getValue() } else { return {} }
    },
    register: function() {
      this._super()
      if (!this.input) return
      this.input.setAttribute('name', this.formname)
    },
    unregister: function() {
      this._super()
      if (!this.input) return
      this.input.removeAttribute('name')
    },
    getNumColumns: function() {
      return 12
    },
    build: function() {
      var self = this
      if (!this.options.compact) {
        this.label = this.header = this.theme.getFormInputLabel(this.getTitle())
      }
      if (this.schema.description) this.description = this.theme.getFormInputDescription(this.schema.description)
      if (this.options.compact) this.container.className += ' compact'

      this.input = document.createElement('div')
      this.control = this.theme.getFormControl(this.label, this.input, this.description)

      if (this.schema.readOnly || this.schema.readonly) {
        this.always_disabled = true
        this.input.disabled = true
      }

      this.container.appendChild(this.control)

      this.schemaeditor = new window.JSONSchemaEditor(this.input, {
        startval: {}
      })
      this.schemaeditor.on('change', function() {
        self.onChange(true)
      })
    },
    enable: function() {
      if (!this.always_disabled) {
        this.input.disabled = false
      }
      this._super()
    },
    disable: function() {
      this.input.disabled = true
      this._super()
    },
    destroy: function() {
      if (this.label && this.label.parentNode) this.label.parentNode.removeChild(this.label)
      if (this.description && this.description.parentNode) this.description.parentNode.removeChild(this.description)
      if (this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input)
      this._super()
    }
  })
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
</style>
