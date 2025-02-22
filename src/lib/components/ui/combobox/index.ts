import { Combobox as ComboboxPrimitive } from "bits-ui";

const Root = ComboboxPrimitive.Root;
const ItemIndicator = ComboboxPrimitive.ItemIndicator;
const HiddenInput = ComboboxPrimitive.HiddenInput;

import Content from "./combobox-content.svelte";
import Group from "./combobox-group.svelte";
import Input from "./combobox-input.svelte";
import Item from "./combobox-item.svelte";
import Label from "./combobox-label.svelte";

export {
  Root,
  HiddenInput,
  Item,
  Group,
  Input,
  ItemIndicator,
  Label,
  Content,
  //
  Root as Combobox,
  HiddenInput as ComboboxHiddenInput,
  Item as ComboboxItem,
  Group as ComboboxGroup,
  Input as ComboboxInput,
  ItemIndicator as ComboboxItemIndicator,
  Label as ComboboxLabel,
  Content as ComboboxContent,
};
