import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button, Callout, Flex } from "@radix-ui/themes";

export function ErrorCallout({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Callout.Root color="red" role="alert">
      <Callout.Icon>
        <ExclamationTriangleIcon />
      </Callout.Icon>
      <Flex align="center" justify="between" gap="3" width="100%">
        <Callout.Text>{message}</Callout.Text>
        {onRetry && (
          <Button size="1" variant="soft" color="red" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Flex>
    </Callout.Root>
  );
}
