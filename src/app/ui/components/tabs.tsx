import React from "react";
import { Trigger, List, Content, Root } from "@radix-ui/react-tabs";
import { cn } from "@/app/helpers/utils";

interface IProps {
  className?: string;
  children?: React.ReactNode;
  [x: string]: any;
}
const Tabs = Root;

const TabsList = React.forwardRef<HTMLDivElement, IProps>(
  ({ className, ...props }: IProps, ref) => (
    <List
      ref={ref}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = List.displayName;

const TabsTrigger = React.forwardRef<HTMLButtonElement, IProps>(
  ({ className, ...props }: IProps, ref) => (
    <Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
        className
      )}
      value={""}
      {...props}
    />
  )
);
TabsTrigger.displayName = Trigger.displayName;

const TabsContent = React.forwardRef<HTMLDivElement, IProps>(
  ({ className, ...props }: IProps, ref) => (
    <Content
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      value={""}
      {...props}
    />
  )
);
TabsContent.displayName = Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
