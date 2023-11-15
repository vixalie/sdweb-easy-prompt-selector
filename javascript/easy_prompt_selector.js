class EPSElementBuilder {
  // Templates
  static baseButton(text, { size = "sm", color = "primary" }) {
    const button = gradioApp().getElementById("txt2img_generate").cloneNode();
    button.id = "";
    // button.classList.remove("gr-button-lg", "gr-button-primary", "lg", "primary");
    button.classList.add(
      // gradio 3.16
      `gr-button-${size}`,
      `gr-button-${color}`,
      // gradio 3.22
      size,
      color
      // gradio 3.23
      // `tool`
    );
    button.textContent = text;

    return button;
  }

  static tagFields() {
    const fields = document.createElement("div");
    fields.style.display = "flex";
    fields.style.flexDirection = "row";
    fields.style.flexWrap = "wrap";
    fields.style.minWidth = "min(320px, 100%)";
    fields.style.maxWidth = "100%";
    fields.style.flex = "1 calc(50% - 20px)";
    fields.style.borderWidth = "1px";
    fields.style.borderColor = "var(--block-border-color,#374151)";
    fields.style.borderRadius = "var(--block-radius,8px)";
    fields.style.padding = "8px";
    fields.style.height = "fit-content";

    return fields;
  }

  // Elements
  static openButton({ onClick }) {
    const button = EPSElementBuilder.baseButton("🔯Select Prompt", {
      size: "sm",
      color: "secondary",
    });
    button.classList.add("easy_prompt_selector_button");
    button.addEventListener("click", onClick);

    return button;
  }

  static areaContainer(id = undefined) {
    const container = gradioApp().getElementById("txt2img_results").cloneNode();
    container.id = id;
    container.style.gap = 0;
    container.style.display = "none";

    return container;
  }

  static tagButton({ title, onClick, onRightClick, color = "primary" }) {
    const button = EPSElementBuilder.baseButton(title, { color });
    button.style.height = "2rem";
    button.style.flexGrow = "0";
    button.style.margin = "2px";
    button.style.width = "max-content !important";

    button.addEventListener("click", onClick);
    button.addEventListener("contextmenu", onRightClick);

    return button;
  }

  static dropDown(id, options, { onChange }) {
    const select = document.createElement("select");
    select.id = id;

    // gradio 3.16
    select.classList.add("gr-box", "gr-input");

    // gradio 3.22
    select.style.color = "var(--body-text-color)";
    select.style.backgroundColor = "var(--input-background-fill)";
    select.style.borderColor = "var(--block-border-color)";
    select.style.borderRadius = "var(--block-radius)";
    select.style.margin = "2px";
    select.addEventListener("change", (event) => {
      onChange(event.target.value);
    });

    const none = ["None"];
    none.concat(options).forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      select.appendChild(option);
    });

    return select;
  }

  static checkbox(text, { id, onChange }) {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";

    const checkbox = gradioApp().querySelector("input[type=checkbox]").cloneNode();
    checkbox.checked = false;
    checkbox.id = id;
    checkbox.addEventListener("change", (event) => {
      onChange(event.target.checked);
    });

    const span = document.createElement("span");
    span.style.marginLeft = "var(--size-2, 8px)";
    span.textContent = text;

    label.appendChild(checkbox);
    label.appendChild(span);

    return label;
  }
}

class EasyPromptSelector {
  PATH_FILE = "tmp/easyPromptSelector.txt";
  AREA_ID = "easy-prompt-selector";
  SELECT_ID = "easy-prompt-selector-select";
  CONTENT_ID = "easy-prompt-selector-content";
  TO_NEGATIVE_PROMPT_ID = "easy-prompt-selector-to-negative-prompt";
  TO_CLIPBOARD_ID = "easy-prompt-selector-to-clipboard";

  constructor(yaml, gradioApp) {
    this.yaml = yaml;
    this.gradioApp = gradioApp;
    this.visible = false;
    this.toNegative = false;
    this.tags = undefined;
    this.adjectiveLast = false;
    this.toClipboard = false;
  }

  async init() {
    this.tags = await this.parseFiles();

    const tagArea = gradioApp().querySelector(`#${this.AREA_ID}`);
    if (tagArea != null) {
      this.visible = false;
      this.changeVisibility(tagArea, this.visible);
      tagArea.remove();
    }

    gradioApp().getElementById("txt2img_toprow").after(this.render());
  }

  async readFile(filepath) {
    const response = await fetch(`file=${filepath}?${new Date().getTime()}`);

    return await response.text();
  }

  async parseFiles() {
    const text = await this.readFile(this.PATH_FILE);
    if (text === "") {
      return {};
    }

    const paths = text.split(/\r\n|\n/);

    const tags = {};
    for (const path of paths) {
      const filename = path.split("/").pop().split(".").slice(0, -1).join(".");
      const data = await this.readFile(path);
      yaml.loadAll(data, function (doc) {
        tags[filename] = doc;
      });
    }

    return tags;
  }

  // Render
  render() {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "10px";

    const dropDown = this.renderDropdown();
    dropDown.style.flex = "1";
    dropDown.style.minWidth = "1";
    row.appendChild(dropDown);

    const settings = document.createElement("div");
    const checkbox = EPSElementBuilder.checkbox("Add to Negatives", {
      id: this.TO_NEGATIVE_PROMPT_ID,
      onChange: (checked) => {
        const clipCheck = gradioApp().querySelector(`#${this.TO_CLIPBOARD_ID}`);
        clipCheck.checked = false;
        this.toNegative = checked;
      },
    });
    const toClipboardCheckbox = EPSElementBuilder.checkbox("Copy to Clipboard", {
      id: this.TO_CLIPBOARD_ID,
      onChange: (checked) => {
        const negCheck = gradioApp().querySelector(`#${this.TO_NEGATIVE_PROMPT_ID}`);
        negCheck.checked = false;
        this.toClipboard = checked;
      },
    });
    settings.style.flex = "1";
    settings.style.display = "flex";
    settings.style.flexDirection = "row";
    settings.style.justifyContent = "space-evenly";
    settings.appendChild(checkbox);
    settings.appendChild(toClipboardCheckbox);

    row.appendChild(settings);

    const container = EPSElementBuilder.areaContainer(this.AREA_ID);

    container.appendChild(row);
    container.appendChild(this.renderContent());

    return container;
  }

  renderDropdown() {
    const dropDown = EPSElementBuilder.dropDown(this.SELECT_ID, Object.keys(this.tags), {
      onChange: (selected) => {
        const content = gradioApp().getElementById(this.CONTENT_ID);
        Array.from(content.childNodes).forEach((node) => {
          const visible = node.id === `easy-prompt-selector-container-${selected}`;
          this.changeVisibility(node, visible);
        });
      },
    });

    return dropDown;
  }

  renderContent() {
    const content = document.createElement("div");
    content.id = this.CONTENT_ID;

    Object.keys(this.tags).forEach((key) => {
      const values = this.tags[key];

      const fields = EPSElementBuilder.tagFields();
      fields.id = `easy-prompt-selector-container-${key}`;
      fields.style.display = "none";
      fields.style.flexDirection = "row";
      fields.style.marginTop = "10px";

      this.renderTagButtons(values, key).forEach((group) => {
        fields.appendChild(group);
      });

      content.appendChild(fields);
    });

    return content;
  }

  renderTagButtons(tags, prefix = "") {
    if (Array.isArray(tags)) {
      return tags.map((tag) => this.renderTagButton(tag, tag, "secondary"));
    } else {
      return Object.keys(tags).map((key) => {
        const values = tags[key];
        const randomKey = `${prefix}:${key}`;

        if (typeof values === "string") {
          return this.renderTagButton(
            values.trim().endsWith("*") ? key + ":" : key,
            values,
            "secondary"
          );
        }

        const fields = EPSElementBuilder.tagFields();
        fields.style.flexDirection = "column";

        fields.append(this.renderTagButton(key, `@${randomKey}@`));

        const buttons = EPSElementBuilder.tagFields();
        buttons.id = "buttons";
        fields.append(buttons);
        this.renderTagButtons(values, randomKey).forEach((button) => {
          buttons.appendChild(button);
        });

        return fields;
      });
    }
  }

  renderTagButton(title, value, color = "primary") {
    return EPSElementBuilder.tagButton({
      title,
      onClick: (e) => {
        e.preventDefault();

        this.addTag(value, this.toNegative || e.metaKey || e.ctrlKey);
      },
      onRightClick: (e) => {
        e.preventDefault();

        this.removeTag(value, this.toNegative || e.metaKey || e.ctrlKey);
      },
      color,
    });
  }

  // Util
  changeVisibility(node, visible) {
    node.style.display = visible ? "flex" : "none";
  }

  addTag(tag, toNegative = false) {
    const id = toNegative ? "txt2img_neg_prompt" : "txt2img_prompt";
    const textarea = gradioApp().getElementById(id).querySelector("textarea");
    const tagToAdd = tag.trim().replace(/\*$/, "");

    if (this.toClipboard) {
      navigator.clipboard.writeText(tagToAdd);
      return;
    }
    if (textarea.value.trim() === "") {
      textarea.value = tagToAdd;
    } else if (this.adjectiveLast) {
      textarea.value += " " + tagToAdd;
    } else if (textarea.value.trim().endsWith(",")) {
      textarea.value += " " + tagToAdd;
    } else {
      textarea.value += ", " + tagToAdd;
    }

    this.adjectiveLast = tag.trim().endsWith("*");
    updateInput(textarea);
  }

  removeTag(tag, toNegative = false) {
    const id = toNegative ? "txt2img_neg_prompt" : "txt2img_prompt";
    const textarea = gradioApp().getElementById(id).querySelector("textarea");

    if (textarea.value.trimStart().startsWith(tag)) {
      const matched = textarea.value.match(
        new RegExp(`${tag.replace(/[-\/\\^$*+?.()|\[\]{}]/g, "\\$&")},*`)
      );
      textarea.value = textarea.value.replace(matched[0], "").trimStart();
    } else {
      textarea.value = textarea.value.replace(`, ${tag}`, "");
    }

    updateInput(textarea);
  }
}

onUiLoaded(async () => {
  yaml = window.jsyaml;
  const easyPromptSelector = new EasyPromptSelector(yaml, gradioApp());

  const button = EPSElementBuilder.openButton({
    onClick: () => {
      const tagArea = gradioApp().querySelector(`#${easyPromptSelector.AREA_ID}`);
      easyPromptSelector.changeVisibility(
        tagArea,
        (easyPromptSelector.visible = !easyPromptSelector.visible)
      );
    },
  });

  const reloadButton = gradioApp().getElementById("easy_prompt_selector_reload_button");
  reloadButton.addEventListener("click", async () => {
    await easyPromptSelector.init();
  });

  const txt2imgActionColumn = gradioApp().getElementById("txt2img_actions_column");
  const container = document.createElement("div");
  container.classList.add("easy_prompt_selector_container");
  container.appendChild(button);
  container.appendChild(reloadButton);

  txt2imgActionColumn.appendChild(container);

  await easyPromptSelector.init();
});
