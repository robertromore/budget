<script lang="ts">
  import * as Form from "$lib/components/ui/form";
  import { insertTransactionSchema } from "$lib/schema";
  import { superForm, superValidateSync } from "sveltekit-superforms/client";
  import { Calendar as CalendarPrimitive } from "bits-ui";
  import * as Calendar from "$lib/components/ui/calendar";
  import { today, getLocalTimeZone } from "@internationalized/date";

  let { accountId } = $props<{
    accountId: number
  }>();

  const form = superForm(
    superValidateSync(insertTransactionSchema),
    {
      SPA: true,
      validators: insertTransactionSchema,
      onUpdate({ form }) {

      }
    }
  );

  let dateValue = $state(today(getLocalTimeZone()));
</script>

<Form.Root controlled {form} schema={insertTransactionSchema} let:config let:submitting>
  <Form.Field {config} name="date">
    <Form.Item>
      <Form.Label>Date</Form.Label>
      <CalendarPrimitive.Root
        bind:value={dateValue}
        class="p-3 rounded-md border"
        on:keydown
        let:months
        let:weekdays
      >
        <Calendar.Header>
          <Calendar.PrevButton />
          <Calendar.Heading />
          <Calendar.NextButton />
        </Calendar.Header>
        <Calendar.Months>
          {#each months as month}
            <Calendar.Grid>
              <Calendar.GridHead>
                <Calendar.GridRow class="flex">
                  {#each weekdays as weekday}
                    <Calendar.HeadCell class="w-auto text-center flex-grow">
                      {weekday.slice(0, 2)}
                    </Calendar.HeadCell>
                  {/each}
                </Calendar.GridRow>
              </Calendar.GridHead>
              <Calendar.GridBody>
                {#each month.weeks as weekDates}
                  <Calendar.GridRow class="w-full mt-2">
                    {#each weekDates as date}
                      <Calendar.Cell {date} class="w-auto text-center flex-grow [&:has([data-selected][data-outside-month])]:bg-transparent [&:has([data-selected])]:bg-transparent">
                        <Calendar.Day {date} month={month.value} />
                      </Calendar.Cell>
                    {/each}
                  </Calendar.GridRow>
                {/each}
              </Calendar.GridBody>
            </Calendar.Grid>
          {/each}
        </Calendar.Months>
      </CalendarPrimitive.Root>
      <Form.Description>Date of the transaction.</Form.Description>
      <Form.Validation />
    </Form.Item>
  </Form.Field>
  <Form.Field {config} name="payee">
    <Form.Item>
      <Form.Label>Payee</Form.Label>
      <Form.Input />
      <Form.Description>The payee.</Form.Description>
      <Form.Validation />
    </Form.Item>
  </Form.Field>
  <Form.Field {config} name="notes">
    <Form.Item>
      <Form.Label>Notes</Form.Label>
      <Form.Input />
      <Form.Description>Notes.</Form.Description>
      <Form.Validation />
    </Form.Item>
  </Form.Field>
  <Form.Field {config} name="category">
    <Form.Item>
      <Form.Label>Category</Form.Label>
      <Form.Input />
      <Form.Description>The category.</Form.Description>
      <Form.Validation />
    </Form.Item>
  </Form.Field>
  <Form.Field {config} name="amount">
    <Form.Item>
      <Form.Label>Amount</Form.Label>
      <Form.Input />
      <Form.Description>The amount.</Form.Description>
      <Form.Validation />
    </Form.Item>
  </Form.Field>
  <Form.Button disabled={submitting}>Submit</Form.Button>
</Form.Root>
