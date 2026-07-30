export class KillSwitch {
  #enabled = false;

  enable(): void {
    this.#enabled = true;
  }

  disableForTest(): void {
    this.#enabled = false;
  }

  get enabled(): boolean {
    return this.#enabled;
  }
}

