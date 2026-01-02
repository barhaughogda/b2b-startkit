import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
} as const;

export default meta;

export const Default = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const Small = {
  args: {
    size: 'sm',
    placeholder: 'Small input',
  },
};

export const Large = {
  args: {
    size: 'lg',
    placeholder: 'Large input',
  },
};

export const Invalid = {
  args: {
    variant: 'invalid',
    placeholder: 'Invalid input',
  },
};

export const WithValue = {
  args: {
    defaultValue: 'Pre-filled value',
  },
};
