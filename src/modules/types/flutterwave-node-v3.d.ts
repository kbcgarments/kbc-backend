declare module 'flutterwave-node-v3' {
  export default class Flutterwave {
    constructor(publicKey: string, secretKey: string);

    Payment: {
      initialize: (payload: any) => Promise<any>;
      verify: (payload: {
        id?: string | number;
        tx_ref?: string;
      }) => Promise<any>;
    };

    Banks: any;
    Charges: any;
    Misc: any;
    Subaccounts: any;
    Transfers: any;
  }
}
