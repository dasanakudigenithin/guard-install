import inquirer from "inquirer";

export async function confirmInstall(packageName: string): Promise<boolean> {
  const { proceed } = await inquirer.prompt([
    { type: "confirm", name: "proceed", message: "Proceed with safe install?", default: false },
  ]);
  return proceed;
}
