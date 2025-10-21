<template>
  <div>
    <div class="jsoneditor-vue" />
  </div>
</template>

<script>
const { JSONEditor } = require('@json-editor/json-editor/dist/jsoneditor')
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
      this.editor = new JSONEditor(this.$el.querySelector('.jsoneditor-vue'), options)
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

if (JSONEditor) {
  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'object' && schema.format === 'schema') {
      return 'schema'
    }

    // If no valid editor is returned, the next resolver function will be used
  })

  JSONEditor.defaults.editors.schema = class schema extends JSONEditor.AbstractEditor {
    setValue(value, initial) {
      this.value = value
      this.schemaeditor.setValue(value)
      this.onChange()
    }

    getValue() {
      if (typeof this.schemaeditor !== 'undefined') { return this.schemaeditor.getValue() } else { return {} }
    }

    register() {
      super.register()
      if (!this.input) return
      this.input.setAttribute('name', this.formname)
    }
    unregister() {
      super.unregister()
      if (!this.input) return
      this.input.removeAttribute('name')
    }
    getNumColumns() {
      return 12
    }
    build() {
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
    }
    enable() {
      if (!this.always_disabled) {
        this.input.disabled = false
      }

      super.enable()
    }
    disable() {
      this.input.disabled = true
      super.disable()
    }
    destroy() {
      if (this.label && this.label.parentNode) this.label.parentNode.removeChild(this.label)
      if (this.description && this.description.parentNode) this.description.parentNode.removeChild(this.description)
      if (this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input)
      super.destroy()
    }
  }
}

</script>

<style>
  /* Override JSONEditor's textarea styles to make it expandable */
  /* Use high specificity to override inline styles */
  .jsoneditor-vue .je-modal textarea.form-control.je-edit-json--textarea[id] {
    resize: both !important;
    min-height: 250px !important;
    min-width: 250px !important;
    /* Add padding to create a larger hit area for the resize handle */
    padding-right: 20px !important;
    padding-bottom: 20px !important;
  }

  /* Make the resize handle easier to grab with larger hit area and clear visibility */
  .jsoneditor-vue .je-modal textarea.form-control.je-edit-json--textarea[id]::-webkit-resizer {
    width: 20px !important;
    height: 20px !important;
    /* Position it in the corner of the larger hit area */
    margin-right: -20px !important;
    margin-bottom: -20px !important;
    /* Use border to create visible resize handle */
    border-right: 2px solid #999 !important;
    border-bottom: 2px solid #999 !important;
    background: transparent !important;
  }

  /* Alternative approach - add a visible corner indicator using ::after pseudo-element */
  .jsoneditor-vue .je-modal textarea.form-control.je-edit-json--textarea[id] {
    position: relative !important;
  }

  .jsoneditor-vue .je-modal textarea.form-control.je-edit-json--textarea[id]::after {
    content: "⋰⋰⋰" !important;
    position: absolute !important;
    bottom: 2px !important;
    right: 2px !important;
    font-size: 8px !important;
    line-height: 6px !important;
    color: #999 !important;
    pointer-events: none !important;
    transform: rotate(45deg) !important;
  }
  .jsoneditor-vue img {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
    width: 150px;
  }
  .jsoneditor-vue img:hover {
    box-shadow: 0 0 2px 1px rgba(0, 140, 186, 0.5);
  }
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
