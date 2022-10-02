import express from "express";
import { Address, toNano } from "ton";
import { main as deploy } from "./build/_deploy";
import * as mainn from "./contracts/main";
import body_parser from "body-parser";

const app = express();
const port = 3000;

app.use(body_parser.json());

app.post('/deploy', async (req, res) => {
    const owner_address = req.body.owner;
    const [contractAddress, Init, initMessage] = await deploy(owner_address);
    res.send({ ok: true, contractAddress: contractAddress, stateInit: Init, payload: initMessage })
});

app.post('/withdraw', (req, res) => {
    const send_to_address = req.body.send_to_address;
    const data = mainn.withdraw({ withdrawAmount: toNano(0.01), withdrawAddress: Address.parseFriendly(send_to_address).address }).toBoc().toString('base64');
    res.send({ payload: data });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});
