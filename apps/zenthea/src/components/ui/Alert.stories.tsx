import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription } from './alert';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          You can add components to your app using the cli.
        </AlertDescription>
      </>
    ),
  },
};

export const Destructive: Story = {
  args: {
    children: (
      <>
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Your session has expired. Please log in again.
        </AlertDescription>
      </>
    ),
  },
};

export const Patient: Story = {
  args: {
    children: (
      <>
        <AlertTitle>Patient Status</AlertTitle>
        <AlertDescription>
          Patient has been successfully registered and is ready for their appointment.
        </AlertDescription>
      </>
    ),
  },
};

export const Appointment: Story = {
  args: {
    children: (
      <>
        <AlertTitle>Appointment Scheduled</AlertTitle>
        <AlertDescription>
          Your appointment has been confirmed for tomorrow at 2:00 PM.
        </AlertDescription>
      </>
    ),
  },
};

export const Critical: Story = {
  args: {
    children: (
      <>
        <AlertTitle>Critical Alert</AlertTitle>
        <AlertDescription>
          Immediate attention required. Patient vitals are outside normal range.
        </AlertDescription>
      </>
    ),
  },
};

export const Normal: Story = {
  args: {
    children: (
      <>
        <AlertTitle>Normal Results</AlertTitle>
        <AlertDescription>
          All lab results are within normal parameters.
        </AlertDescription>
      </>
    ),
  },
};

export const Abnormal: Story = {
  args: {
    children: (
      <>
        <AlertTitle>Abnormal Results</AlertTitle>
        <AlertDescription>
          Lab results show values outside normal range. Review required.
        </AlertDescription>
      </>
    ),
  },
};

export const Vital: Story = {
  args: {
    children: (
      <>
        <AlertTitle>Vital Signs Alert</AlertTitle>
        <AlertDescription>
          Patient&apos;s blood pressure is elevated. Monitor closely.
        </AlertDescription>
      </>
    ),
  },
};