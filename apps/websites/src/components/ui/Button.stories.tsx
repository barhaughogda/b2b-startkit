import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
} as const;

export default meta;

export const Default = {
  args: {
    children: 'Button',
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};
